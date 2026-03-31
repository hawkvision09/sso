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

const CALCULATED_TAB = 'calculated_data';
const CALCULATED_COLUMNS = [...SUMMARY_COLUMNS];
const TIMELINE_MAX_POINTS = 24;

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

    if (!sheetNames.has(CALCULATED_TAB)) {
      requests.push({ addSheet: { properties: { title: CALCULATED_TAB } } });
    }

    if (!sheetNames.has(TIMELINE_TAB)) {
      requests.push({ addSheet: { properties: { title: TIMELINE_TAB } } });
    }

    for (const sheet of existingSheets) {
      const title = sheet.properties?.title;
      const sheetId = sheet.properties?.sheetId;
      if (!sheetId) continue;
      if (
        title !== EVENTS_TAB &&
        title !== PRODUCTS_TAB &&
        title !== FUNDS_TAB &&
        title !== SUMMARY_TAB &&
        title !== CALCULATED_TAB &&
        title !== TIMELINE_TAB
      ) {
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
      range: `${CALCULATED_TAB}!A1:M1`,
      valueInputOption: 'RAW',
      requestBody: { values: [CALCULATED_COLUMNS] },
    });

    await this.sheets.spreadsheets.values.update({
      spreadsheetId: this.spreadsheetId,
      range: `${TIMELINE_TAB}!A1:G1`,
      valueInputOption: 'RAW',
      requestBody: { values: [TIMELINE_COLUMNS] },
    });

    await this.ensureEventMonthlyAmountFormula();
  }

  private async ensureEventMonthlyAmountFormula(): Promise<void> {
    const monthlyAmountHeader = 'monthly_amount';
    const monthlyAmountFormula = `=ARRAYFORMULA(IF(A2:A=\"\",\"\",IF(Q2:Q<>\"active\",0,IF(I2:I>TEXT(TODAY(),\"yyyy-mm-dd\"),0,IF((J2:J<>\"\")*(J2:J<TEXT(TODAY(),\"yyyy-mm-dd\")),0,IF((F2:F=\"recurring\")+(F2:F=\"dynamic\"),IF(K2:K=\"yearly\",N(G2:G)/12,N(G2:G)),IF(F2:F=\"one_time\",IF(((YEAR(TODAY())-YEAR(IFERROR(DATEVALUE(I2:I),TODAY())))*12+MONTH(TODAY())-MONTH(IFERROR(DATEVALUE(I2:I),TODAY())))<IF(IFERROR(N(L2:L),1)<=0,1,IFERROR(N(L2:L),1)),IF(((YEAR(TODAY())-YEAR(IFERROR(DATEVALUE(I2:I),TODAY())))*12+MONTH(TODAY())-MONTH(IFERROR(DATEVALUE(I2:I),TODAY())))>=0,N(G2:G)/IF(IFERROR(N(L2:L),1)<=0,1,IFERROR(N(L2:L),1)),0),0),0)))))))`;

    await this.sheets.spreadsheets.values.update({
      spreadsheetId: this.spreadsheetId,
      range: `${EVENTS_TAB}!R1`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [[monthlyAmountHeader]],
      },
    });

    await this.sheets.spreadsheets.values.update({
      spreadsheetId: this.spreadsheetId,
      range: `${EVENTS_TAB}!R2`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[monthlyAmountFormula]],
      },
    });
  }

  private calculatedSummaryFormulaRow(productId: string, rowNumber: number): string[] {
    const productRef = `$A${rowNumber}`;

    return [
      productId,
      `=ROUND(SUMIFS(cost_events!$R$2:$R,cost_events!$B$2:$B,${productRef}),2)`,
      `=ROUND(SUMIFS(cost_events!$R$2:$R,cost_events!$B$2:$B,${productRef},cost_events!$E$2:$E,\"team\"),2)`,
      `=ROUND(SUMIFS(cost_events!$R$2:$R,cost_events!$B$2:$B,${productRef},cost_events!$E$2:$E,\"infra\"),2)`,
      `=ROUND(SUMIFS(cost_events!$R$2:$R,cost_events!$B$2:$B,${productRef},cost_events!$E$2:$E,\"tool\"),2)`,
      `=ROUND(SUMIFS(cost_events!$R$2:$R,cost_events!$B$2:$B,${productRef},cost_events!$E$2:$E,\"hardware\"),2)`,
      `=ROUND(SUMIFS(cost_events!$R$2:$R,cost_events!$B$2:$B,${productRef},cost_events!$E$2:$E,\"other\"),2)`,
      `=COUNT(FILTER(cost_events!$A$2:$A,cost_events!$B$2:$B=${productRef},cost_events!$E$2:$E=\"team\",cost_events!$F$2:$F=\"recurring\",cost_events!$R$2:$R>0))`,
      `=IF(H${rowNumber}>0,ROUND(C${rowNumber}/H${rowNumber}),0)`,
      `=ROUND(B${rowNumber}/2)`,
      `=ROUND(B${rowNumber}/4)`,
      '=NOW()',
      `=COUNTIFS(cost_events!$B$2:$B,${productRef},cost_events!$Q$2:$Q,\"active\")`,
    ];
  }


  async ensureCalculatedSummaryRow(productId: string): Promise<void> {
    await this.ensureSheets();

    const normalizedProductId = String(productId || '').trim();
    if (!normalizedProductId) return;

    const response = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: `${CALCULATED_TAB}!A:A`,
    });

    const idColumn = response.data.values || [];
    const existingRowIndex = idColumn.findIndex((row: any[]) => String(row[0] || '').trim() === normalizedProductId);
    if (existingRowIndex !== -1) return;

    const rowNumber = idColumn.length + 1;
    const row = this.calculatedSummaryFormulaRow(normalizedProductId, rowNumber);

    await this.sheets.spreadsheets.values.append({
      spreadsheetId: this.spreadsheetId,
      range: `${CALCULATED_TAB}!A:M`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [row],
      },
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

  private parseYearMonthIndex(month: string): number | null {
    const m = String(month || '').trim();
    if (!/^\d{4}-\d{2}$/.test(m)) return null;

    const [year, mon] = m.split('-').map((value) => parseInt(value, 10));
    if (!Number.isFinite(year) || !Number.isFinite(mon) || mon < 1 || mon > 12) {
      return null;
    }

    return year * 12 + (mon - 1);
  }

  private toYearMonth(index: number): string {
    const year = Math.floor(index / 12);
    const month = (index % 12) + 1;
    return `${year}-${String(month).padStart(2, '0')}`;
  }

  private toMonthLabel(index: number): string {
    const year = Math.floor(index / 12);
    const month = index % 12;
    return new Date(year, month, 1).toLocaleDateString('en-IN', {
      month: 'short',
      year: 'numeric',
    });
  }

  private monthStart(index: number): Date {
    const year = Math.floor(index / 12);
    const month = index % 12;
    return new Date(year, month, 1);
  }

  private getTimelineRetentionRange(): { minIndex: number; maxIndex: number } {
    const now = new Date();
    const currentIndex = now.getFullYear() * 12 + now.getMonth();
    const lastClosedIndex = currentIndex - 1;

    if (lastClosedIndex < 0) {
      return { minIndex: 0, maxIndex: -1 };
    }

    return {
      minIndex: Math.max(0, lastClosedIndex - (TIMELINE_MAX_POINTS - 1)),
      maxIndex: lastClosedIndex,
    };
  }

  private normalizeTimelinePoints(points: TimelinePoint[]): TimelinePoint[] {
    const { minIndex, maxIndex } = this.getTimelineRetentionRange();

    const deduped = new Map<string, TimelinePoint>();
    for (const point of points) {
      const month = String(point.month || '').trim();
      const monthIndex = this.parseYearMonthIndex(month);
      if (monthIndex === null) continue;
      if (monthIndex < minIndex || monthIndex > maxIndex) continue;

      deduped.set(month, {
        month,
        label: String(point.label || month).trim() || month,
        burn_rate: Number.isFinite(Number(point.burn_rate)) ? Number(point.burn_rate) : 0,
        // Retention window contains only completed months.
        is_forecast: false,
      });
    }

    return Array.from(deduped.values())
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-TIMELINE_MAX_POINTS);
  }

  private eventMonthlyCostForIndex(event: CostEvent, targetIndex: number): number {
    if (event.status !== 'active') return 0;
    if (!event.start_date) return 0;

    const startDate = new Date(event.start_date);
    if (Number.isNaN(startDate.getTime())) return 0;

    const targetDate = this.monthStart(targetIndex);
    const startMonthIndex = startDate.getFullYear() * 12 + startDate.getMonth();

    if (targetIndex < startMonthIndex) return 0;

    if (event.end_date) {
      const endDate = new Date(event.end_date);
      if (!Number.isNaN(endDate.getTime())) {
        const endMonthIndex = endDate.getFullYear() * 12 + endDate.getMonth();
        if (targetIndex > endMonthIndex) return 0;
      }
    }

    if (event.cost_type === 'recurring' || event.cost_type === 'dynamic') {
      if (event.recurrence === 'yearly') return Number(event.amount || 0) / 12;
      return Number(event.amount || 0);
    }

    if (event.cost_type === 'one_time') {
      const amortMonths = Math.max(1, Number(event.amortization_months || 1));
      const monthDiff = targetIndex - startMonthIndex;
      if (monthDiff >= 0 && monthDiff < amortMonths) {
        return Number(event.amount || 0) / amortMonths;
      }
      return 0;
    }

    return 0;
  }

  private calculateMonthlyBurnForIndex(events: CostEvent[], targetIndex: number): number {
    const total = events.reduce((sum, event) => sum + this.eventMonthlyCostForIndex(event, targetIndex), 0);
    return Math.round(total * 100) / 100;
  }

  private calculateMonthlyEventCount(events: CostEvent[], targetIndex: number): number {
    return events.filter((event) => this.eventMonthlyCostForIndex(event, targetIndex) > 0).length;
  }

  private async getJoinMonthIndex(productId: string, events: CostEvent[]): Promise<number | null> {
    const products = await this.getAllProducts();
    const product = products.find((item) => String(item.product_id || '').trim() === productId);

    const candidateDates: Date[] = [];

    if (product?.created_at) {
      const created = new Date(product.created_at);
      if (!Number.isNaN(created.getTime())) candidateDates.push(created);
    }

    for (const event of events) {
      if (event.created_at) {
        const created = new Date(event.created_at);
        if (!Number.isNaN(created.getTime())) candidateDates.push(created);
      }
    }

    // Fallback for legacy rows without created_at.
    if (candidateDates.length === 0) {
      for (const event of events) {
        const start = new Date(event.start_date || '');
        if (!Number.isNaN(start.getTime())) candidateDates.push(start);
      }
    }

    if (candidateDates.length === 0) return null;

    const joinDate = new Date(Math.min(...candidateDates.map((d) => d.getTime())));
    return joinDate.getFullYear() * 12 + joinDate.getMonth();
  }

  private rowsAreEqual(a: any[][], b: any[][]): boolean {
    if (a.length !== b.length) return false;

    for (let i = 0; i < a.length; i += 1) {
      if ((a[i] || []).join('||') !== (b[i] || []).join('||')) {
        return false;
      }
    }

    return true;
  }

  async pruneTimelineCache(productId: string): Promise<{ product_id: string; kept: number; removed: number; added: number }> {
    await this.ensureSheets();

    const normalizedProductId = String(productId || '').trim();
    if (!normalizedProductId) {
      throw new Error('product_id is required');
    }

    const response = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: `${TIMELINE_TAB}!A2:G`,
    });

    const rows = response.data.values || [];
    const productRows = rows.filter((row: any[]) => String(row[0] || '').trim() === normalizedProductId);
    const otherRows = rows.filter((row: any[]) => String(row[0] || '').trim() !== normalizedProductId);

    const parsedRows = productRows
      .map((row: any[]) => {
        const month = String(row[1] || '').trim();
        const monthIndex = this.parseYearMonthIndex(month);
        if (monthIndex === null) return null;
        return {
          month,
          monthIndex,
          label: String(row[2] || '').trim(),
          burnRate: parseFloat(String(row[3] || '0')) || 0,
          isForecast: String(row[4] || '').toLowerCase() === 'true',
          calculatedAt: String(row[5] || '').trim(),
          eventCount: parseInt(String(row[6] || '0'), 10) || 0,
        };
      })
      .filter(Boolean) as Array<{
        month: string;
        monthIndex: number;
        label: string;
        burnRate: number;
        isForecast: boolean;
        calculatedAt: string;
        eventCount: number;
      }>;

    const byMonth = new Map<string, typeof parsedRows[number]>();
    for (const row of parsedRows) {
      const existing = byMonth.get(row.month);
      if (!existing) {
        byMonth.set(row.month, row);
        continue;
      }

      const existingTs = new Date(existing.calculatedAt || 0).getTime();
      const candidateTs = new Date(row.calculatedAt || 0).getTime();
      if (candidateTs >= existingTs) {
        byMonth.set(row.month, row);
      }
    }

    const productEvents = (await this.getAllEvents()).filter(
      (event) => String(event.product_id || '').trim() === normalizedProductId
    );

    const joinMonthIndex = await this.getJoinMonthIndex(normalizedProductId, productEvents);
    const { minIndex, maxIndex } = this.getTimelineRetentionRange();

    const targetMonthIndexes: number[] = [];
    if (joinMonthIndex !== null && maxIndex >= 0) {
      const startIndex = Math.max(joinMonthIndex, minIndex);
      for (let idx = startIndex; idx <= maxIndex; idx += 1) {
        targetMonthIndexes.push(idx);
      }
    }

    const nowIso = new Date().toISOString();
    const normalizedRows = targetMonthIndexes.map((monthIndex) => {
      const month = this.toYearMonth(monthIndex);
      const existing = byMonth.get(month);

      if (existing) {
        return [
          normalizedProductId,
          month,
          existing.label || this.toMonthLabel(monthIndex),
          String(existing.burnRate),
          'false',
          existing.calculatedAt || nowIso,
          String(existing.eventCount || 0),
        ];
      }

      const burnRate = this.calculateMonthlyBurnForIndex(productEvents, monthIndex);
      const eventCount = this.calculateMonthlyEventCount(productEvents, monthIndex);
      return [
        normalizedProductId,
        month,
        this.toMonthLabel(monthIndex),
        String(burnRate),
        'false',
        nowIso,
        String(eventCount),
      ];
    });

    const currentComparable = [...productRows]
      .sort((a: any[], b: any[]) => String(a[1] || '').localeCompare(String(b[1] || '')));
    const nextComparable = [...normalizedRows]
      .sort((a: any[], b: any[]) => String(a[1] || '').localeCompare(String(b[1] || '')));

    if (!this.rowsAreEqual(currentComparable, nextComparable)) {
      await this.replaceTabRows(`${TIMELINE_TAB}!A2:G`, [...otherRows, ...normalizedRows]);
    }

    const existingUniqueRowsInRange = Array.from(byMonth.values()).filter(
      (row) => targetMonthIndexes.includes(row.monthIndex)
    ).length;

    return {
      product_id: normalizedProductId,
      kept: normalizedRows.length,
      removed: Math.max(0, productRows.length - normalizedRows.length),
      added: Math.max(0, normalizedRows.length - existingUniqueRowsInRange),
    };
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

    await this.ensureCalculatedSummaryRow(event.product_id);
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

    await this.ensureCalculatedSummaryRow(normalized.product_id);

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

    const [eventsResp, fundsResp, summaryResp, calculatedResp, timelineResp] = await Promise.all([
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
        range: `${CALCULATED_TAB}!A2:M`,
      }),
      this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${TIMELINE_TAB}!A2:G`,
      }),
    ]);

    const eventsRows = eventsResp.data.values || [];
    const fundsRows = fundsResp.data.values || [];
    const summaryRows = summaryResp.data.values || [];
    const calculatedRows = calculatedResp.data.values || [];
    const timelineRows = timelineResp.data.values || [];

    const retainedEvents = eventsRows.filter((row: any[]) => String(row[1] || '').trim() !== normalizedProductId);
    const retainedFunds = fundsRows.filter((row: any[]) => String(row[0] || '').trim() !== normalizedProductId);
    const retainedSummary = summaryRows.filter((row: any[]) => String(row[0] || '').trim() !== normalizedProductId);
    const retainedCalculated = calculatedRows.filter((row: any[]) => String(row[0] || '').trim() !== normalizedProductId);
    const retainedTimeline = timelineRows.filter((row: any[]) => String(row[0] || '').trim() !== normalizedProductId);

    await Promise.all([
      this.replaceTabRows(`${EVENTS_TAB}!A2:Q`, retainedEvents),
      this.replaceTabRows(`${FUNDS_TAB}!A2:C`, retainedFunds),
      this.replaceTabRows(`${SUMMARY_TAB}!A2:M`, retainedSummary),
      this.replaceTabRows(`${CALCULATED_TAB}!A2:M`, retainedCalculated),
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

    await this.ensureCalculatedSummaryRow(normalizedProductId);

    const calculatedResponse = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: `${CALCULATED_TAB}!A2:M`,
      valueRenderOption: 'UNFORMATTED_VALUE',
      dateTimeRenderOption: 'FORMATTED_STRING',
    });

    const calculatedRows = calculatedResponse.data.values || [];
    const calculatedRow = calculatedRows.find((r: any[]) => r[0] === normalizedProductId);
    if (calculatedRow) {
      return this.rowToSummary(calculatedRow);
    }

    const response = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: `${SUMMARY_TAB}!A2:M`,
      valueRenderOption: 'UNFORMATTED_VALUE',
      dateTimeRenderOption: 'FORMATTED_STRING',
    });

    const rows = response.data.values || [];
    const row = rows.find((r: any[]) => r[0] === normalizedProductId);
    if (!row) return null;

    return this.rowToSummary(row);
  }

  async getAllSummaries(): Promise<CostSummary[]> {
    await this.ensureSheets();

    const calculatedResponse = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: `${CALCULATED_TAB}!A2:M`,
      valueRenderOption: 'UNFORMATTED_VALUE',
      dateTimeRenderOption: 'FORMATTED_STRING',
    });

    const calculatedRows = calculatedResponse.data.values || [];
    if (calculatedRows.length > 0) {
      return calculatedRows
        .map((row: any[]) => this.rowToSummary(row))
        .filter((summary: CostSummary) => !!summary.product_id);
    }

    const response = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: `${SUMMARY_TAB}!A2:M`,
      valueRenderOption: 'UNFORMATTED_VALUE',
      dateTimeRenderOption: 'FORMATTED_STRING',
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

    await this.pruneTimelineCache(normalizedProductId);

    const response = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: `${TIMELINE_TAB}!A2:G`,
    });

    const rows = response.data.values || [];
    const productRows = rows
      .filter((row: any[]) => Array.isArray(row) && row.length >= 6)
      .filter((row: any[]) => String(row[0] || '').trim() === normalizedProductId)
      .filter((row: any[]) => /^\d{4}-\d{2}$/.test(String(row[1] || '').trim()));

    if (productRows.length === 0) return null;

    const byMonth = new Map<string, any[]>();
    for (const row of productRows) {
      const month = String(row[1] || '').trim();
      const existing = byMonth.get(month);
      if (!existing) {
        byMonth.set(month, row);
        continue;
      }

      const existingTs = new Date(String(existing[5] || '')).getTime();
      const candidateTs = new Date(String(row[5] || '')).getTime();
      if (candidateTs >= existingTs) {
        byMonth.set(month, row);
      }
    }

    const dedupedRows = Array.from(byMonth.values())
      .sort((a: any[], b: any[]) => String(a[1] || '').localeCompare(String(b[1] || '')))
      .slice(-TIMELINE_MAX_POINTS);

    const timeline = dedupedRows
      .map((row: any[]) => ({
        month: String(row[1] || ''),
        label: String(row[2] || ''),
        burn_rate: parseFloat(String(row[3] || '0')) || 0,
        is_forecast: String(row[4] || '').toLowerCase() === 'true',
      }))
      .filter((item: TimelinePoint) => !!item.month);

    const calculatedAt = String(dedupedRows[dedupedRows.length - 1]?.[5] || new Date().toISOString());
    const eventCount = parseInt(String(dedupedRows[dedupedRows.length - 1]?.[6] || '0'), 10) || 0;

    return {
      product_id: normalizedProductId,
      calculated_at: calculatedAt,
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

    const timelineLimited = this.normalizeTimelinePoints(
      timeline
        .filter((point) => /^\d{4}-\d{2}$/.test(String(point.month || '').trim()))
        .sort((a, b) => String(a.month || '').localeCompare(String(b.month || '')))
    );

    const freshRows = timelineLimited
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

