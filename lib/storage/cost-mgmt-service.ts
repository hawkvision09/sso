import { google } from 'googleapis';

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

const EVENTS_TAB = 'cost_events';
const EVENTS_COLUMNS = [
  'event_id',
  'product_id',
  'title',
  'description',
  'category',
  'cost_type',
  'amount',
  'currency',
  'start_date',
  'end_date',
  'recurrence',
  'amortization_months',
  'impact_area',
  'tags',
  'created_by',
  'created_at',
  'status',
];

const PRODUCTS_TAB = 'products';
const PRODUCTS_COLUMNS = [
  'product_id',
  'name',
  'description',
  'created_by',
  'created_at',
  'status',
];

const FUNDS_TAB = 'product_funds';
const FUNDS_COLUMNS = [
  'product_id',
  'available_funds',
  'updated_at',
];

const SUMMARY_TAB = 'summary';
const SUMMARY_COLUMNS = [
  'product_id',
  'monthly_burn',
  'team_cost',
  'infra_cost',
  'tool_cost',
  'hardware_cost',
  'other_cost',
  'developer_count',
  'cost_per_developer',
  'cost_per_sprint',
  'cost_per_feature',
  'calculated_at',
  'event_count',
];

const TIMELINE_TAB = 'timeline_cache';
const TIMELINE_COLUMNS = [
  'product_id',
  'month',
  'label',
  'burn_rate',
  'is_forecast',
  'calculated_at',
  'event_count',
];

export class CostMgmtService {
  private sheets: any;
  private spreadsheetId: string;

  constructor(accessToken: string, spreadsheetId: string) {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });
    this.sheets = google.sheets({ version: 'v4', auth });
    this.spreadsheetId = spreadsheetId;
  }

  async ensureSheets(): Promise<void> {
    const metadata = await this.sheets.spreadsheets.get({ spreadsheetId: this.spreadsheetId });
    const existingSheets = metadata.data.sheets || [];
    const sheetNames = new Set(existingSheets.map((s: any) => s.properties?.title));

    const requests: any[] = [];

    if (!sheetNames.has(EVENTS_TAB)) {
      requests.push({ addSheet: { properties: { title: EVENTS_TAB } } });
    }

    if (!sheetNames.has(PRODUCTS_TAB)) {
      requests.push({ addSheet: { properties: { title: PRODUCTS_TAB } } });
    }

    if (!sheetNames.has(FUNDS_TAB)) {
      requests.push({ addSheet: { properties: { title: FUNDS_TAB } } });
    }

    if (!sheetNames.has(SUMMARY_TAB)) {
      requests.push({ addSheet: { properties: { title: SUMMARY_TAB } } });
    }

    if (!sheetNames.has(TIMELINE_TAB)) {
      requests.push({ addSheet: { properties: { title: TIMELINE_TAB } } });
    }

    for (const sheet of existingSheets) {
      const title = sheet.properties?.title;
      const sheetId = sheet.properties?.sheetId;
      if (!sheetId) continue;
      if (title !== EVENTS_TAB && title !== PRODUCTS_TAB && title !== FUNDS_TAB && title !== SUMMARY_TAB && title !== TIMELINE_TAB) {
        requests.push({ deleteSheet: { sheetId } });
      }
    }

    if (requests.length > 0) {
      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId: this.spreadsheetId,
        requestBody: { requests },
      });
    }

    await this.sheets.spreadsheets.values.update({
      spreadsheetId: this.spreadsheetId,
      range: `${EVENTS_TAB}!A1:Q1`,
      valueInputOption: 'RAW',
      requestBody: { values: [EVENTS_COLUMNS] },
    });

    await this.sheets.spreadsheets.values.update({
      spreadsheetId: this.spreadsheetId,
      range: `${PRODUCTS_TAB}!A1:F1`,
      valueInputOption: 'RAW',
      requestBody: { values: [PRODUCTS_COLUMNS] },
    });

    await this.sheets.spreadsheets.values.update({
      spreadsheetId: this.spreadsheetId,
      range: `${FUNDS_TAB}!A1:C1`,
      valueInputOption: 'RAW',
      requestBody: { values: [FUNDS_COLUMNS] },
    });

    await this.sheets.spreadsheets.values.update({
      spreadsheetId: this.spreadsheetId,
      range: `${SUMMARY_TAB}!A1:M1`,
      valueInputOption: 'RAW',
      requestBody: { values: [SUMMARY_COLUMNS] },
    });

    await this.sheets.spreadsheets.values.update({
      spreadsheetId: this.spreadsheetId,
      range: `${TIMELINE_TAB}!A1:G1`,
      valueInputOption: 'RAW',
      requestBody: { values: [TIMELINE_COLUMNS] },
    });
  }

  private rowToEvent(row: any[]): CostEvent {
    return {
      event_id: row[0] || '',
      product_id: row[1] || '',
      title: row[2] || '',
      description: row[3] || '',
      category: row[4] || 'other',
      cost_type: row[5] || 'recurring',
      amount: parseFloat(row[6]) || 0,
      currency: row[7] || 'INR',
      start_date: row[8] || '',
      end_date: row[9] || null,
      recurrence: row[10] || null,
      amortization_months: row[11] ? parseInt(row[11], 10) : null,
      impact_area: row[12] ? row[12].split(',').map((s: string) => s.trim()).filter(Boolean) : [],
      tags: row[13] ? row[13].split(',').map((s: string) => s.trim()).filter(Boolean) : [],
      created_by: row[14] || '',
      created_at: row[15] || '',
      status: row[16] === 'inactive' ? 'inactive' : 'active',
    };
  }

  private eventToRow(event: CostEvent): string[] {
    return [
      event.event_id,
      event.product_id,
      event.title,
      event.description || '',
      event.category,
      event.cost_type,
      event.amount.toString(),
      event.currency || 'INR',
      event.start_date,
      event.end_date || '',
      event.recurrence || '',
      event.amortization_months?.toString() || '',
      (event.impact_area || []).join(', '),
      (event.tags || []).join(', '),
      event.created_by || '',
      event.created_at || new Date().toISOString(),
      event.status || 'active',
    ];
  }

  private rowToProduct(row: any[]): CostProduct {
    return {
      product_id: row[0] || '',
      name: row[1] || '',
      description: row[2] || '',
      created_by: row[3] || '',
      created_at: row[4] || '',
      status: row[5] === 'archived' ? 'archived' : 'active',
    };
  }

  private productToRow(product: CostProduct): string[] {
    return [
      product.product_id,
      product.name,
      product.description || '',
      product.created_by || '',
      product.created_at || new Date().toISOString(),
      product.status || 'active',
    ];
  }

  private inferProductName(productId: string): string {
    return productId
      .replace(/^PRD[-_]?/i, 'Product ')
      .replace(/[-_]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  async getAllEvents(): Promise<CostEvent[]> {
    await this.ensureSheets();
    const response = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: `${EVENTS_TAB}!A2:Q`,
    });

    const rows = response.data.values || [];
    return rows.map((row: any[]) => this.rowToEvent(row)).filter((event: CostEvent) => !!event.event_id);
  }

  async appendEvent(event: CostEvent): Promise<void> {
    await this.ensureSheets();
    await this.sheets.spreadsheets.values.append({
      spreadsheetId: this.spreadsheetId,
      range: `${EVENTS_TAB}!A:Q`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [this.eventToRow(event)],
      },
    });
  }

  async updateEventStatus(eventId: string, status: CostEventStatus): Promise<boolean> {
    await this.ensureSheets();

    const idResponse = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: `${EVENTS_TAB}!A:A`,
    });

    const idColumn = idResponse.data.values || [];
    const rowIndex = idColumn.findIndex((row: any[]) => row[0] === eventId);
    if (rowIndex === -1) return false;

    const sheetRow = rowIndex + 1;

    await this.sheets.spreadsheets.values.update({
      spreadsheetId: this.spreadsheetId,
      range: `${EVENTS_TAB}!Q${sheetRow}`,
      valueInputOption: 'RAW',
      requestBody: { values: [[status]] },
    });

    return true;
  }

  async getAllProducts(): Promise<CostProduct[]> {
    await this.ensureSheets();
    const response = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: `${PRODUCTS_TAB}!A2:F`,
    });

    const rows = response.data.values || [];
    return rows
      .map((row: any[]) => this.rowToProduct(row))
      .filter((product: CostProduct) => !!product.product_id);
  }

  async getProductsIncludingInferred(): Promise<CostProduct[]> {
    const [products, events] = await Promise.all([
      this.getAllProducts(),
      this.getAllEvents(),
    ]);

    const seen = new Set(products.map((p) => p.product_id));
    const inferred: CostProduct[] = [];

    for (const event of events) {
      const productId = String(event.product_id || '').trim();
      if (!productId || seen.has(productId)) continue;

      seen.add(productId);
      inferred.push({
        product_id: productId,
        name: this.inferProductName(productId),
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

    const existing = await this.getAllProducts();
    if (existing.some((p) => p.product_id === product.product_id)) {
      throw new Error(`Product ${product.product_id} already exists`);
    }

    const normalized: CostProduct = {
      product_id: product.product_id,
      name: product.name,
      description: product.description || '',
      created_by: product.created_by || '',
      created_at: product.created_at || new Date().toISOString(),
      status: product.status || 'active',
    };

    await this.sheets.spreadsheets.values.append({
      spreadsheetId: this.spreadsheetId,
      range: `${PRODUCTS_TAB}!A:F`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [this.productToRow(normalized)],
      },
    });

    return normalized;
  }

  private async replaceTabRows(range: string, rows: any[][]): Promise<void> {
    await this.sheets.spreadsheets.values.clear({
      spreadsheetId: this.spreadsheetId,
      range,
    });

    if (rows.length > 0) {
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range,
        valueInputOption: 'RAW',
        requestBody: {
          values: rows,
        },
      });
    }
  }

  async clearProductData(productId: string): Promise<ProductDataClearResult> {
    await this.ensureSheets();

    const normalizedProductId = String(productId || '').trim();
    if (!normalizedProductId) {
      throw new Error('product_id is required');
    }

    const [eventsResp, fundsResp, summaryResp, timelineResp] = await Promise.all([
      this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${EVENTS_TAB}!A2:Q`,
      }),
      this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${FUNDS_TAB}!A2:C`,
      }),
      this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${SUMMARY_TAB}!A2:M`,
      }),
      this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${TIMELINE_TAB}!A2:G`,
      }),
    ]);

    const eventsRows = eventsResp.data.values || [];
    const fundsRows = fundsResp.data.values || [];
    const summaryRows = summaryResp.data.values || [];
    const timelineRows = timelineResp.data.values || [];

    const retainedEvents = eventsRows.filter((row: any[]) => String(row[1] || '').trim() !== normalizedProductId);
    const retainedFunds = fundsRows.filter((row: any[]) => String(row[0] || '').trim() !== normalizedProductId);
    const retainedSummary = summaryRows.filter((row: any[]) => String(row[0] || '').trim() !== normalizedProductId);
    const retainedTimeline = timelineRows.filter((row: any[]) => String(row[0] || '').trim() !== normalizedProductId);

    await Promise.all([
      this.replaceTabRows(`${EVENTS_TAB}!A2:Q`, retainedEvents),
      this.replaceTabRows(`${FUNDS_TAB}!A2:C`, retainedFunds),
      this.replaceTabRows(`${SUMMARY_TAB}!A2:M`, retainedSummary),
      this.replaceTabRows(`${TIMELINE_TAB}!A2:G`, retainedTimeline),
    ]);

    return {
      product_id: normalizedProductId,
      events_removed: eventsRows.length - retainedEvents.length,
      funds_removed: fundsRows.length - retainedFunds.length,
      summary_removed: summaryRows.length - retainedSummary.length,
      timeline_rows_removed: timelineRows.length - retainedTimeline.length,
    };
  }

  async deleteProduct(productId: string): Promise<ProductDeleteResult> {
    await this.ensureSheets();

    const normalizedProductId = String(productId || '').trim();
    if (!normalizedProductId) {
      throw new Error('product_id is required');
    }

    const clearResult = await this.clearProductData(normalizedProductId);

    const productsResp = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: `${PRODUCTS_TAB}!A2:F`,
    });

    const productRows = productsResp.data.values || [];
    const retainedProducts = productRows.filter((row: any[]) => String(row[0] || '').trim() !== normalizedProductId);
    const productRemoved = productRows.length !== retainedProducts.length;

    await this.replaceTabRows(`${PRODUCTS_TAB}!A2:F`, retainedProducts);

    return {
      ...clearResult,
      product_removed: productRemoved,
    };
  }

  async getAvailableFunds(productId: string): Promise<number | null> {
    await this.ensureSheets();

    const normalizedProductId = String(productId || '').trim();
    if (!normalizedProductId) return null;

    const response = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: `${FUNDS_TAB}!A2:C`,
    });

    const rows = response.data.values || [];
    const row = rows.find((r: any[]) => r[0] === normalizedProductId);
    if (!row) return null;

    const parsed = parseFloat(String(row[1] || ''));
    if (Number.isNaN(parsed)) return null;

    return parsed;
  }

  async upsertAvailableFunds(productId: string, availableFunds: number): Promise<ProductFunds> {
    await this.ensureSheets();

    const normalizedProductId = String(productId || '').trim();
    if (!normalizedProductId) {
      throw new Error('product_id is required');
    }

    if (!Number.isFinite(availableFunds) || availableFunds < 0) {
      throw new Error('available_funds must be a non-negative number');
    }

    const updatedAt = new Date().toISOString();

    const response = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: `${FUNDS_TAB}!A:A`,
    });

    const idColumn = response.data.values || [];
    const rowIndex = idColumn.findIndex((row: any[]) => row[0] === normalizedProductId);

    if (rowIndex === -1) {
      await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: `${FUNDS_TAB}!A:C`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [[normalizedProductId, availableFunds.toString(), updatedAt]],
        },
      });
    } else {
      const sheetRow = rowIndex + 1;
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: `${FUNDS_TAB}!A${sheetRow}:C${sheetRow}`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [[normalizedProductId, availableFunds.toString(), updatedAt]],
        },
      });
    }

    return {
      product_id: normalizedProductId,
      available_funds: availableFunds,
      updated_at: updatedAt,
    };
  }

  private rowToSummary(row: any[]): CostSummary {
    return {
      product_id: row[0] || '',
      monthly_burn: parseFloat(row[1]) || 0,
      team_cost: parseFloat(row[2]) || 0,
      infra_cost: parseFloat(row[3]) || 0,
      tool_cost: parseFloat(row[4]) || 0,
      hardware_cost: parseFloat(row[5]) || 0,
      other_cost: parseFloat(row[6]) || 0,
      developer_count: parseInt(row[7]) || 0,
      cost_per_developer: parseFloat(row[8]) || 0,
      cost_per_sprint: parseFloat(row[9]) || 0,
      cost_per_feature: parseFloat(row[10]) || 0,
      calculated_at: row[11] || '',
      event_count: parseInt(row[12]) || 0,
    };
  }

  private summaryToRow(summary: CostSummary): string[] {
    return [
      summary.product_id,
      summary.monthly_burn.toString(),
      summary.team_cost.toString(),
      summary.infra_cost.toString(),
      summary.tool_cost.toString(),
      summary.hardware_cost.toString(),
      summary.other_cost.toString(),
      summary.developer_count.toString(),
      summary.cost_per_developer.toString(),
      summary.cost_per_sprint.toString(),
      summary.cost_per_feature.toString(),
      summary.calculated_at,
      summary.event_count.toString(),
    ];
  }

  async getSummary(productId: string): Promise<CostSummary | null> {
    await this.ensureSheets();

    const normalizedProductId = String(productId || '').trim();
    if (!normalizedProductId) return null;

    const response = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: `${SUMMARY_TAB}!A2:M`,
    });

    const rows = response.data.values || [];
    const row = rows.find((r: any[]) => r[0] === normalizedProductId);
    if (!row) return null;

    return this.rowToSummary(row);
  }

  async getAllSummaries(): Promise<CostSummary[]> {
    await this.ensureSheets();

    const response = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: `${SUMMARY_TAB}!A2:M`,
    });

    const rows = response.data.values || [];
    return rows
      .map((row: any[]) => this.rowToSummary(row))
      .filter((summary: CostSummary) => !!summary.product_id);
  }

  async upsertSummary(summary: CostSummary): Promise<CostSummary> {
    await this.ensureSheets();

    const normalizedProductId = String(summary.product_id || '').trim();
    if (!normalizedProductId) {
      throw new Error('product_id is required');
    }

    const response = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: `${SUMMARY_TAB}!A:A`,
    });

    const idColumn = response.data.values || [];
    const rowIndex = idColumn.findIndex((row: any[]) => row[0] === normalizedProductId);

    const normalizedSummary: CostSummary = {
      ...summary,
      product_id: normalizedProductId,
      calculated_at: summary.calculated_at || new Date().toISOString(),
    };

    if (rowIndex === -1) {
      // Insert new row
      await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: `${SUMMARY_TAB}!A:M`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [this.summaryToRow(normalizedSummary)],
        },
      });
    } else {
      // Update existing row
      const sheetRow = rowIndex + 1;
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: `${SUMMARY_TAB}!A${sheetRow}:M${sheetRow}`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [this.summaryToRow(normalizedSummary)],
        },
      });
    }

    return normalizedSummary;
  }

  async getTimelineCache(productId: string): Promise<CostTimelineCache | null> {
    await this.ensureSheets();

    const normalizedProductId = String(productId || '').trim();
    if (!normalizedProductId) return null;

    const response = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: `${TIMELINE_TAB}!A2:G`,
    });

    const rows = response.data.values || [];
    const productRows = rows.filter((row: any[]) => {
      // Expect at least: product_id, month, label, burn_rate, is_forecast, calculated_at, event_count
      if (!Array.isArray(row) || row.length < 6) return false;
      const rowProductId = String(row[0] || '').trim();
      const month = String(row[1] || '').trim();
      const calculatedAt = String(row[5] || '').trim();
      if (!rowProductId || !month || !calculatedAt) return false;
      if (!/^\d{4}-\d{2}$/.test(month)) return false;
      return rowProductId === normalizedProductId;
    });
    if (productRows.length === 0) return null;

    const latestCalculatedAt = productRows.reduce((latest: string, row: any[]) => {
      const candidate = String(row[5] || '');
      if (!latest) return candidate;
      return new Date(candidate).getTime() > new Date(latest).getTime() ? candidate : latest;
    }, '');

    if (!latestCalculatedAt) return null;

    const latestRows = productRows.filter((row: any[]) => String(row[5] || '').trim() === latestCalculatedAt);
    const timeline = latestRows
      .map((row: any[]) => ({
        month: String(row[1] || ''),
        label: String(row[2] || ''),
        burn_rate: parseFloat(String(row[3] || '0')) || 0,
        is_forecast: String(row[4] || '').toLowerCase() === 'true',
      }))
      .filter((item: TimelinePoint) => !!item.month)
      .sort((a: TimelinePoint, b: TimelinePoint) => a.month.localeCompare(b.month));

    const eventCount = parseInt(String(latestRows[0]?.[6] || '0'), 10) || 0;

    return {
      product_id: normalizedProductId,
      calculated_at: latestCalculatedAt,
      event_count: eventCount,
      timeline,
    };
  }

  async upsertTimelineCache(input: CostTimelineCache): Promise<CostTimelineCache> {
    await this.ensureSheets();

    const normalizedProductId = String(input.product_id || '').trim();
    if (!normalizedProductId) {
      throw new Error('product_id is required');
    }

    const calculatedAt = input.calculated_at || new Date().toISOString();
    const timeline = Array.isArray(input.timeline) ? input.timeline : [];
    const eventCount = Number.isFinite(input.event_count) ? input.event_count : 0;

    const freshRows = timeline
      .filter((point) => /^\d{4}-\d{2}$/.test(String(point.month || '').trim()))
      .map((point) => [
        normalizedProductId,
        String(point.month || '').trim(),
        String(point.label || '').trim(),
        String(Number(point.burn_rate) || 0),
        point.is_forecast ? 'true' : 'false',
        calculatedAt,
        String(eventCount),
      ]);

    // Replace this product's snapshot instead of append: this prevents duplicate month rows.
    const existingResponse = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: `${TIMELINE_TAB}!A2:G`,
    });

    const existingRows = existingResponse.data.values || [];
    const retainedRows = existingRows.filter((row: any[]) => String(row[0] || '').trim() !== normalizedProductId);
    const mergedRows = [...retainedRows, ...freshRows];

    await this.sheets.spreadsheets.values.clear({
      spreadsheetId: this.spreadsheetId,
      range: `${TIMELINE_TAB}!A2:G`,
    });

    if (mergedRows.length > 0) {
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: `${TIMELINE_TAB}!A2:G`,
        valueInputOption: 'RAW',
        requestBody: {
          values: mergedRows,
        },
      });
    }

    return {
      product_id: normalizedProductId,
      calculated_at: calculatedAt,
      event_count: eventCount,
      timeline: freshRows.map((row) => ({
        month: String(row[1]),
        label: String(row[2]),
        burn_rate: parseFloat(String(row[3])) || 0,
        is_forecast: String(row[4]) === 'true',
      })),
    };
  }
}

