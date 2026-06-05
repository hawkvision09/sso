import { getMongoDb } from '@/lib/db/mongo';

const COST_MGMT_DB_NAME = 'cost-mgmt';
const COST_MGMT_SCHEMA_VERSION = 'v2-mongo';
const TIMELINE_MAX_POINTS = 24;

export type CostEventStatus = 'active' | 'inactive';
export type ProductStatus = 'active' | 'archived';

export interface CostEvent {
  event_id: string;
  product_id: string;
  title: string;
  description?: string;
  category: 'team' | 'infra' | 'tool' | 'hardware' | 'other';
  cost_type: 'one_time' | 'recurring' | 'dynamic';
  amount: number;
  currency: string;
  start_date: string;
  end_date?: string | null;
  recurrence?: 'monthly' | 'yearly' | null;
  amortization_months?: number | null;
  impact_area?: string[];
  tags?: string[];
  created_by?: string;
  created_at?: string;
  status: CostEventStatus;
}

export interface CostProduct {
  product_id: string;
  name: string;
  description?: string;
  created_by?: string;
  created_at?: string;
  status: ProductStatus;
}

export interface ProductFunds {
  product_id: string;
  available_funds: number;
  updated_at: string;
}

export interface CostSummary {
  product_id: string;
  monthly_burn: number;
  team_cost: number;
  infra_cost: number;
  tool_cost: number;
  hardware_cost: number;
  other_cost: number;
  developer_count: number;
  cost_per_developer: number;
  cost_per_sprint: number;
  cost_per_feature: number;
  calculated_at: string;
  event_count: number;
}

export interface TimelinePoint {
  month: string;
  label: string;
  burn_rate: number;
  is_forecast: boolean;
}

export interface CostTimelineCache {
  product_id: string;
  calculated_at: string;
  event_count: number;
  timeline: TimelinePoint[];
}

export interface ProductDataClearResult {
  product_id: string;
  events_removed: number;
  funds_removed: number;
  summary_removed: number;
  timeline_rows_removed: number;
}

export interface ProductDeleteResult extends ProductDataClearResult {
  product_removed: boolean;
}

export interface CostActivityLogView {
  log_id: string;
  entity_type: 'event' | 'product' | 'funds' | 'system';
  entity_id: string;
  action: string;
  details: string;
  timestamp: string;
  product_id?: string;
}

interface CostEventRecord extends CostEvent {
  ownerUserId: string;
}

interface CostProductRecord extends CostProduct {
  ownerUserId: string;
}

interface ProductFundsRecord extends ProductFunds {
  ownerUserId: string;
}

interface CostSummaryRecord extends CostSummary {
  ownerUserId: string;
}

interface CostTimelineCacheRecord extends CostTimelineCache {
  ownerUserId: string;
}

interface CostActivityLogRecord extends CostActivityLogView {
  ownerUserId: string;
}

let indexesReadyPromise: Promise<void> | null = null;

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function toMonthIndex(dateValue: string | null | undefined): number | null {
  if (!dateValue) return null;
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return null;
  return date.getFullYear() * 12 + date.getMonth();
}

function monthIndexToKey(index: number): string {
  const year = Math.floor(index / 12);
  const month = (index % 12) + 1;
  return `${year}-${String(month).padStart(2, '0')}`;
}

function monthIndexToLabel(index: number): string {
  const year = Math.floor(index / 12);
  const month = index % 12;
  return new Date(year, month, 1).toLocaleDateString('en-IN', {
    month: 'short',
    year: 'numeric',
  });
}

function currentMonthIndex(): number {
  const now = new Date();
  return now.getFullYear() * 12 + now.getMonth();
}

function inferProductName(productId: string): string {
  return productId
    .replace(/^PRD[-_]?/i, 'Product ')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeEvent(record: CostEventRecord): CostEvent {
  return {
    event_id: record.event_id,
    product_id: record.product_id,
    title: record.title,
    description: record.description || '',
    category: record.category,
    cost_type: record.cost_type,
    amount: Number(record.amount || 0),
    currency: record.currency || 'INR',
    start_date: record.start_date,
    end_date: record.end_date || null,
    recurrence: record.recurrence || null,
    amortization_months: record.amortization_months ?? null,
    impact_area: Array.isArray(record.impact_area) ? record.impact_area : [],
    tags: Array.isArray(record.tags) ? record.tags : [],
    created_by: record.created_by || '',
    created_at: record.created_at || '',
    status: record.status === 'inactive' ? 'inactive' : 'active',
  };
}

function normalizeProduct(record: CostProductRecord): CostProduct {
  return {
    product_id: record.product_id,
    name: record.name,
    description: record.description || '',
    created_by: record.created_by || '',
    created_at: record.created_at || '',
    status: record.status === 'archived' ? 'archived' : 'active',
  };
}

function normalizeSummary(record: CostSummaryRecord): CostSummary {
  return {
    product_id: record.product_id,
    monthly_burn: Number(record.monthly_burn || 0),
    team_cost: Number(record.team_cost || 0),
    infra_cost: Number(record.infra_cost || 0),
    tool_cost: Number(record.tool_cost || 0),
    hardware_cost: Number(record.hardware_cost || 0),
    other_cost: Number(record.other_cost || 0),
    developer_count: Number(record.developer_count || 0),
    cost_per_developer: Number(record.cost_per_developer || 0),
    cost_per_sprint: Number(record.cost_per_sprint || 0),
    cost_per_feature: Number(record.cost_per_feature || 0),
    calculated_at: record.calculated_at || '',
    event_count: Number(record.event_count || 0),
  };
}

function normalizeTimeline(record: CostTimelineCacheRecord): CostTimelineCache {
  return {
    product_id: record.product_id,
    calculated_at: record.calculated_at || '',
    event_count: Number(record.event_count || 0),
    timeline: Array.isArray(record.timeline) ? record.timeline : [],
  };
}

function eventMonthlyCostForMonth(event: CostEvent, targetMonthIndex: number): number {
  if (event.status !== 'active') return 0;

  const startMonth = toMonthIndex(event.start_date);
  if (startMonth === null || targetMonthIndex < startMonth) return 0;

  const endMonth = toMonthIndex(event.end_date || null);
  if (endMonth !== null && targetMonthIndex > endMonth) return 0;

  if (event.cost_type === 'recurring' || event.cost_type === 'dynamic') {
    return event.recurrence === 'yearly' ? Number(event.amount || 0) / 12 : Number(event.amount || 0);
  }

  if (event.cost_type === 'one_time') {
    const amortMonths = Math.max(1, Number(event.amortization_months || 1));
    const offset = targetMonthIndex - startMonth;
    return offset >= 0 && offset < amortMonths ? Number(event.amount || 0) / amortMonths : 0;
  }

  return 0;
}

function computeSummaryFromEvents(productId: string, events: CostEvent[]): CostSummary {
  const monthIndex = currentMonthIndex();
  const activeEvents = events.filter((event) => event.product_id === productId);
  const bucket = {
    team: 0,
    infra: 0,
    tool: 0,
    hardware: 0,
    other: 0,
  };

  let eventCount = 0;
  let developerCount = 0;

  for (const event of activeEvents) {
    const monthlyCost = round2(eventMonthlyCostForMonth(event, monthIndex));
    if (monthlyCost <= 0) continue;

    bucket[event.category] += monthlyCost;
    eventCount += 1;

    if (event.category === 'team' && (event.cost_type === 'recurring' || event.cost_type === 'dynamic')) {
      developerCount += 1;
    }
  }

  const monthlyBurn = round2(bucket.team + bucket.infra + bucket.tool + bucket.hardware + bucket.other);
  const costPerDeveloper = developerCount > 0 ? round2(bucket.team / developerCount) : 0;

  return {
    product_id: productId,
    monthly_burn: monthlyBurn,
    team_cost: round2(bucket.team),
    infra_cost: round2(bucket.infra),
    tool_cost: round2(bucket.tool),
    hardware_cost: round2(bucket.hardware),
    other_cost: round2(bucket.other),
    developer_count: developerCount,
    cost_per_developer: costPerDeveloper,
    cost_per_sprint: round2(monthlyBurn / 2),
    cost_per_feature: round2(monthlyBurn / 4),
    calculated_at: new Date().toISOString(),
    event_count: eventCount,
  };
}

function normalizeTimelinePoints(points: TimelinePoint[]): TimelinePoint[] {
  const nowIndex = currentMonthIndex() - 1;
  const minIndex = Math.max(0, nowIndex - (TIMELINE_MAX_POINTS - 1));
  const byMonth = new Map<string, TimelinePoint>();

  for (const point of points) {
    const month = String(point.month || '').trim();
    if (!/^\d{4}-\d{2}$/.test(month)) continue;
    const monthIndex = toMonthIndex(`${month}-01`);
    if (monthIndex === null || monthIndex < minIndex || monthIndex > nowIndex) continue;

    byMonth.set(month, {
      month,
      label: String(point.label || month).trim() || month,
      burn_rate: round2(Number(point.burn_rate || 0)),
      is_forecast: false,
    });
  }

  return Array.from(byMonth.values())
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-TIMELINE_MAX_POINTS);
}

async function ensureIndexes(): Promise<void> {
  if (!indexesReadyPromise) {
    indexesReadyPromise = (async () => {
      const db = await getMongoDb(COST_MGMT_DB_NAME);
      await Promise.all([
        db.collection<CostEventRecord>('cost_events').createIndex({ ownerUserId: 1, event_id: 1 }, { unique: true }),
        db.collection<CostEventRecord>('cost_events').createIndex({ ownerUserId: 1, product_id: 1, status: 1 }),
        db.collection<CostProductRecord>('products').createIndex({ ownerUserId: 1, product_id: 1 }, { unique: true }),
        db.collection<ProductFundsRecord>('product_funds').createIndex({ ownerUserId: 1, product_id: 1 }, { unique: true }),
        db.collection<CostSummaryRecord>('summary').createIndex({ ownerUserId: 1, product_id: 1 }, { unique: true }),
        db.collection<CostTimelineCacheRecord>('timeline_cache').createIndex({ ownerUserId: 1, product_id: 1 }, { unique: true }),
        db.collection<CostActivityLogRecord>('activity_logs').createIndex({ ownerUserId: 1, log_id: 1 }, { unique: true }),
        db.collection<CostActivityLogRecord>('activity_logs').createIndex({ ownerUserId: 1, timestamp: -1 }),
      ]);
    })();
  }

  await indexesReadyPromise;
}

export class CostMgmtService {
  constructor(private readonly ownerUserId: string) {}

  private async getDb() {
    await ensureIndexes();
    return getMongoDb(COST_MGMT_DB_NAME);
  }

  async ensureSheets(): Promise<void> {
    await this.getDb();
  }

  private async logActivity(input: {
    action: string;
    details: string;
    entity_type?: 'event' | 'product' | 'funds' | 'system';
    entity_id?: string;
    product_id?: string;
    timestamp?: string;
  }): Promise<void> {
    const db = await this.getDb();
    await db.collection<CostActivityLogRecord>('activity_logs').insertOne({
      ownerUserId: this.ownerUserId,
      log_id: `LOG_${Date.now()}_${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      entity_type: input.entity_type || 'system',
      entity_id: input.entity_id || '',
      action: input.action,
      details: input.details,
      timestamp: input.timestamp || new Date().toISOString(),
      product_id: input.product_id || '',
    });
  }

  async getAllEvents(): Promise<CostEvent[]> {
    await this.ensureSheets();
    const db = await this.getDb();
    const docs = await db
      .collection<CostEventRecord>('cost_events')
      .find({ ownerUserId: this.ownerUserId })
      .sort({ created_at: -1 })
      .toArray();

    return docs.map(normalizeEvent);
  }

  async appendEventOptimized(event: CostEvent): Promise<void> {
    await this.ensureSheets();
    const db = await this.getDb();
    const createdAt = event.created_at || new Date().toISOString();
    await db.collection<CostEventRecord>('cost_events').insertOne({
      ownerUserId: this.ownerUserId,
      ...event,
      currency: event.currency || 'INR',
      description: event.description || '',
      end_date: event.end_date || null,
      recurrence: event.recurrence || null,
      amortization_months: event.amortization_months ?? null,
      impact_area: Array.isArray(event.impact_area) ? event.impact_area : [],
      tags: Array.isArray(event.tags) ? event.tags : [],
      created_by: event.created_by || '',
      created_at: createdAt,
      status: event.status || 'active',
    });
    await this.logActivity({
      action: 'Cost event created',
      details: `Created ${event.title} for ${event.product_id}`,
      entity_type: 'event',
      entity_id: event.event_id,
      product_id: event.product_id,
      timestamp: createdAt,
    });
  }

  async appendEvent(event: CostEvent): Promise<void> {
    await this.appendEventOptimized(event);
  }

  async updateEventStatus(eventId: string, status: CostEventStatus): Promise<boolean> {
    await this.ensureSheets();
    const db = await this.getDb();
    const existing = await db.collection<CostEventRecord>('cost_events').findOne({
      ownerUserId: this.ownerUserId,
      event_id: eventId,
    });
    const result = await db.collection<CostEventRecord>('cost_events').updateOne(
      { ownerUserId: this.ownerUserId, event_id: eventId },
      { $set: { status } }
    );

    if (result.matchedCount > 0 && existing) {
      await this.logActivity({
        action: status === 'inactive' ? 'Cost event archived' : 'Cost event activated',
        details: `${existing.title} is now ${status}`,
        entity_type: 'event',
        entity_id: eventId,
        product_id: existing.product_id,
      });
    }

    return result.matchedCount > 0;
  }

  async getAllProducts(): Promise<CostProduct[]> {
    await this.ensureSheets();
    const db = await this.getDb();
    const docs = await db
      .collection<CostProductRecord>('products')
      .find({ ownerUserId: this.ownerUserId })
      .sort({ name: 1 })
      .toArray();

    return docs.map(normalizeProduct);
  }

  async getProductsIncludingInferred(): Promise<CostProduct[]> {
    const [products, events] = await Promise.all([this.getAllProducts(), this.getAllEvents()]);
    const seen = new Set(products.map((product) => product.product_id));
    const inferred: CostProduct[] = [];

    for (const event of events) {
      const productId = String(event.product_id || '').trim();
      if (!productId || seen.has(productId)) continue;

      seen.add(productId);
      inferred.push({
        product_id: productId,
        name: inferProductName(productId),
        description: 'Auto-discovered from existing cost events',
        created_by: event.created_by || '',
        created_at: event.created_at || '',
        status: 'active',
      });
    }

    return [...products, ...inferred].sort((a, b) => a.name.localeCompare(b.name));
  }

  async createProduct(product: CostProduct): Promise<CostProduct> {
    await this.ensureSheets();
    const db = await this.getDb();
    const existing = await db.collection<CostProductRecord>('products').findOne({
      ownerUserId: this.ownerUserId,
      product_id: product.product_id,
    });

    if (existing) {
      throw new Error(`Product ${product.product_id} already exists`);
    }

    const normalized: CostProductRecord = {
      ownerUserId: this.ownerUserId,
      product_id: product.product_id,
      name: product.name,
      description: product.description || '',
      created_by: product.created_by || '',
      created_at: product.created_at || new Date().toISOString(),
      status: product.status || 'active',
    };

    await db.collection<CostProductRecord>('products').insertOne(normalized);
    await this.logActivity({
      action: 'Product created',
      details: `Created product ${normalized.name}`,
      entity_type: 'product',
      entity_id: normalized.product_id,
      product_id: normalized.product_id,
      timestamp: normalized.created_at,
    });
    return normalizeProduct(normalized);
  }

  async clearProductData(productId: string): Promise<ProductDataClearResult> {
    await this.ensureSheets();
    const db = await this.getDb();
    const normalizedProductId = String(productId || '').trim();
    if (!normalizedProductId) throw new Error('product_id is required');

    const existingTimeline = await db.collection<CostTimelineCacheRecord>('timeline_cache').findOne({
      ownerUserId: this.ownerUserId,
      product_id: normalizedProductId,
    });

    const [eventsResult, fundsResult, summaryResult, timelineResult] = await Promise.all([
      db.collection<CostEventRecord>('cost_events').deleteMany({ ownerUserId: this.ownerUserId, product_id: normalizedProductId }),
      db.collection<ProductFundsRecord>('product_funds').deleteMany({ ownerUserId: this.ownerUserId, product_id: normalizedProductId }),
      db.collection<CostSummaryRecord>('summary').deleteMany({ ownerUserId: this.ownerUserId, product_id: normalizedProductId }),
      db.collection<CostTimelineCacheRecord>('timeline_cache').deleteMany({ ownerUserId: this.ownerUserId, product_id: normalizedProductId }),
    ]);

    const result = {
      product_id: normalizedProductId,
      events_removed: eventsResult.deletedCount,
      funds_removed: fundsResult.deletedCount,
      summary_removed: summaryResult.deletedCount,
      timeline_rows_removed: timelineResult.deletedCount > 0 ? (existingTimeline?.timeline.length || 0) : 0,
    };

    await this.logActivity({
      action: 'Product data cleared',
      details: `Cleared ${result.events_removed} events and ${result.funds_removed} fund records for ${normalizedProductId}`,
      entity_type: 'product',
      entity_id: normalizedProductId,
      product_id: normalizedProductId,
    });

    return result;
  }

  async deleteProduct(productId: string): Promise<ProductDeleteResult> {
    await this.ensureSheets();
    const db = await this.getDb();
    const normalizedProductId = String(productId || '').trim();
    if (!normalizedProductId) throw new Error('product_id is required');

    const clearResult = await this.clearProductData(normalizedProductId);
    const productResult = await db.collection<CostProductRecord>('products').deleteOne({
      ownerUserId: this.ownerUserId,
      product_id: normalizedProductId,
    });

    const result = {
      ...clearResult,
      product_removed: productResult.deletedCount > 0,
    };

    if (result.product_removed) {
      await this.logActivity({
        action: 'Product deleted',
        details: `Deleted product ${normalizedProductId}`,
        entity_type: 'product',
        entity_id: normalizedProductId,
        product_id: normalizedProductId,
      });
    }

    return result;
  }

  async getAvailableFunds(productId: string): Promise<number | null> {
    await this.ensureSheets();
    const db = await this.getDb();
    const row = await db.collection<ProductFundsRecord>('product_funds').findOne({
      ownerUserId: this.ownerUserId,
      product_id: String(productId || '').trim(),
    });

    return row ? Number(row.available_funds || 0) : null;
  }

  async upsertAvailableFunds(productId: string, availableFunds: number): Promise<ProductFunds> {
    await this.ensureSheets();
    const db = await this.getDb();
    const normalizedProductId = String(productId || '').trim();
    if (!normalizedProductId) throw new Error('product_id is required');
    if (!Number.isFinite(availableFunds) || availableFunds < 0) {
      throw new Error('available_funds must be a non-negative number');
    }

    const updatedAt = new Date().toISOString();
    await db.collection<ProductFundsRecord>('product_funds').updateOne(
      { ownerUserId: this.ownerUserId, product_id: normalizedProductId },
      {
        $set: {
          ownerUserId: this.ownerUserId,
          product_id: normalizedProductId,
          available_funds: availableFunds,
          updated_at: updatedAt,
        },
      },
      { upsert: true }
    );

    await this.logActivity({
      action: 'Available funds updated',
      details: `Set available funds for ${normalizedProductId} to ${availableFunds}`,
      entity_type: 'funds',
      entity_id: normalizedProductId,
      product_id: normalizedProductId,
      timestamp: updatedAt,
    });

    return {
      product_id: normalizedProductId,
      available_funds: availableFunds,
      updated_at: updatedAt,
    };
  }

  async getSummary(productId: string): Promise<CostSummary | null> {
    await this.ensureSheets();
    const db = await this.getDb();
    const normalizedProductId = String(productId || '').trim();
    if (!normalizedProductId) return null;

    const stored = await db.collection<CostSummaryRecord>('summary').findOne({
      ownerUserId: this.ownerUserId,
      product_id: normalizedProductId,
    });
    if (stored) return normalizeSummary(stored);

    const events = await this.getAllEvents();
    return computeSummaryFromEvents(normalizedProductId, events);
  }

  async getAllSummaries(): Promise<CostSummary[]> {
    await this.ensureSheets();
    const [products, events] = await Promise.all([this.getProductsIncludingInferred(), this.getAllEvents()]);
    return products.map((product) => computeSummaryFromEvents(product.product_id, events));
  }

  async upsertSummary(summary: CostSummary): Promise<CostSummary> {
    await this.ensureSheets();
    const db = await this.getDb();
    const normalizedProductId = String(summary.product_id || '').trim();
    if (!normalizedProductId) throw new Error('product_id is required');

    const normalized: CostSummaryRecord = {
      ownerUserId: this.ownerUserId,
      ...summary,
      product_id: normalizedProductId,
      calculated_at: summary.calculated_at || new Date().toISOString(),
    };

    await db.collection<CostSummaryRecord>('summary').updateOne(
      { ownerUserId: this.ownerUserId, product_id: normalizedProductId },
      { $set: normalized },
      { upsert: true }
    );

    return normalizeSummary(normalized);
  }

  async getTimelineCache(productId: string): Promise<CostTimelineCache | null> {
    await this.ensureSheets();
    const db = await this.getDb();
    const normalizedProductId = String(productId || '').trim();
    if (!normalizedProductId) return null;

    await this.pruneTimelineCache(normalizedProductId);
    const stored = await db.collection<CostTimelineCacheRecord>('timeline_cache').findOne({
      ownerUserId: this.ownerUserId,
      product_id: normalizedProductId,
    });

    return stored ? normalizeTimeline(stored) : null;
  }

  async upsertTimelineCache(input: CostTimelineCache): Promise<CostTimelineCache> {
    await this.ensureSheets();
    const db = await this.getDb();
    const normalizedProductId = String(input.product_id || '').trim();
    if (!normalizedProductId) throw new Error('product_id is required');

    const normalized: CostTimelineCacheRecord = {
      ownerUserId: this.ownerUserId,
      product_id: normalizedProductId,
      calculated_at: input.calculated_at || new Date().toISOString(),
      event_count: Number(input.event_count || 0),
      timeline: normalizeTimelinePoints(Array.isArray(input.timeline) ? input.timeline : []),
    };

    await db.collection<CostTimelineCacheRecord>('timeline_cache').updateOne(
      { ownerUserId: this.ownerUserId, product_id: normalizedProductId },
      { $set: normalized },
      { upsert: true }
    );

    return normalizeTimeline(normalized);
  }

  async pruneTimelineCache(productId: string): Promise<{ product_id: string; kept: number; removed: number; added: number }> {
    await this.ensureSheets();
    const db = await this.getDb();
    const normalizedProductId = String(productId || '').trim();
    if (!normalizedProductId) throw new Error('product_id is required');

    const existing = await db.collection<CostTimelineCacheRecord>('timeline_cache').findOne({
      ownerUserId: this.ownerUserId,
      product_id: normalizedProductId,
    });

    if (!existing) {
      return { product_id: normalizedProductId, kept: 0, removed: 0, added: 0 };
    }

    const normalizedTimeline = normalizeTimelinePoints(existing.timeline || []);
    const removed = Math.max(0, (existing.timeline || []).length - normalizedTimeline.length);

    await db.collection<CostTimelineCacheRecord>('timeline_cache').updateOne(
      { ownerUserId: this.ownerUserId, product_id: normalizedProductId },
      {
        $set: {
          timeline: normalizedTimeline,
          calculated_at: existing.calculated_at || new Date().toISOString(),
          event_count: Number(existing.event_count || 0),
        },
      }
    );

    return {
      product_id: normalizedProductId,
      kept: normalizedTimeline.length,
      removed,
      added: 0,
    };
  }

  async getActivityLogs(limit = 20): Promise<CostActivityLogView[]> {
    await this.ensureSheets();
    const db = await this.getDb();
    const normalizedLimit = Math.max(1, Math.min(limit, 100));
    const docs = await db
      .collection<CostActivityLogRecord>('activity_logs')
      .find({ ownerUserId: this.ownerUserId })
      .sort({ timestamp: -1 })
      .limit(normalizedLimit)
      .toArray();

    if (docs.length === 0) {
      const events = await db
        .collection<CostEventRecord>('cost_events')
        .find({ ownerUserId: this.ownerUserId })
        .sort({ created_at: -1 })
        .limit(normalizedLimit)
        .toArray();

      return events.map((event) => ({
        log_id: event.event_id,
        entity_type: 'event',
        entity_id: event.event_id,
        action: event.status === 'inactive' ? 'Cost event archived' : 'Cost event created',
        details: `Created ${event.title} for ${event.product_id}`,
        timestamp: event.created_at || event.start_date || new Date().toISOString(),
        product_id: event.product_id || '',
      }));
    }

    return docs.map((record) => ({
      log_id: record.log_id,
      entity_type: record.entity_type || 'system',
      entity_id: record.entity_id || '',
      action: record.action || 'Activity',
      details: record.details || '',
      timestamp: record.timestamp || '',
      product_id: record.product_id || '',
    }));
  }
}
