import { getMongoDb } from '@/lib/db/mongo';

const COUPONS_DB_NAME = 'coupons';
const COUPONS_SCHEMA_VERSION = 'v2-mongo';

export interface Coupon {
  id: string;
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  minOrderValue?: number;
  maxDiscount?: number;
  validFrom: string;
  validUntil: string;
  usageLimit?: number;
  usageLimitPerUser?: number;
  usageCount?: number;
  status?: 'active' | 'expired' | 'upcoming';
  applicableProducts?: string[];
  applicableCategories?: string[];
  userType?: string;
  allowedEmails?: string[];
  stackable?: boolean;
  applyOnSale?: boolean;
  description?: string;
  createdAt: string;
  createdBy: string;
}

interface CouponRecord {
  ownerUserId: string;
  id: string;
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  minOrderValue: number;
  maxDiscount: number;
  validFrom: string;
  validUntil: string;
  usageLimit: number;
  usageLimitPerUser: number;
  usageCount: number;
  applicableProducts: string[];
  applicableCategories: string[];
  userType: string;
  allowedEmails: string[];
  stackable: boolean;
  applyOnSale: boolean;
  description: string;
  createdAt: string;
  createdBy: string;
}

interface CouponUsageRecord {
  ownerUserId: string;
  usageId: string;
  couponCode: string;
  userId: string;
  userEmail: string;
  orderAmount: number;
  discountAmount: number;
  finalAmount: number;
  usedAt: string;
}

interface CouponActivityLogRecord {
  ownerUserId: string;
  logId: string;
  couponCode: string;
  action: string;
  userType: 'Admin' | 'Client' | 'System';
  details: string;
  timestamp: string;
}

export interface CouponActivityLogView {
  logId: string;
  couponCode: string;
  action: string;
  userType: 'Admin' | 'Client' | 'System';
  details: string;
  timestamp: string;
}

interface ApplicableCouponFilter {
  userId?: string;
  userEmail?: string;
  userType?: string;
  products?: string[];
  categories?: string[];
  orderAmount?: number;
}

interface CouponUsageStats {
  code: string;
  totalUsed: number;
  usageLimit: number;
  usageLimitPerUser: number;
  usagePerUser: Map<string, number>;
  recentUsage: Array<{
    userId: string;
    email: string;
    orderAmount: number;
    discountAmount: number;
    finalAmount: number;
    usedAt: string;
  }>;
}

let indexesReadyPromise: Promise<void> | null = null;

function normalizeCoupon(record: CouponRecord): Coupon {
  return {
    id: record.id,
    code: record.code,
    type: record.type,
    value: record.value,
    minOrderValue: record.minOrderValue,
    maxDiscount: record.maxDiscount,
    validFrom: record.validFrom,
    validUntil: record.validUntil,
    usageLimit: record.usageLimit,
    usageLimitPerUser: record.usageLimitPerUser,
    usageCount: record.usageCount,
    status: calculateStatus(record.validFrom, record.validUntil),
    applicableProducts: record.applicableProducts,
    applicableCategories: record.applicableCategories,
    userType: record.userType,
    allowedEmails: record.allowedEmails,
    stackable: record.stackable,
    applyOnSale: record.applyOnSale,
    description: record.description,
    createdAt: record.createdAt,
    createdBy: record.createdBy,
  };
}

function calculateStatus(validFrom: string, validUntil: string): 'active' | 'expired' | 'upcoming' {
  const now = new Date();
  const from = validFrom ? new Date(validFrom) : null;
  const until = validUntil ? new Date(validUntil) : null;

  if (from && now < from) return 'upcoming';
  if (until && now > until) return 'expired';
  return 'active';
}

async function ensureIndexes(): Promise<void> {
  if (!indexesReadyPromise) {
    indexesReadyPromise = (async () => {
      const db = await getMongoDb(COUPONS_DB_NAME);
      await Promise.all([
        db.collection<CouponRecord>('coupons').createIndex({ ownerUserId: 1, code: 1 }, { unique: true }),
        db.collection<CouponRecord>('coupons').createIndex({ ownerUserId: 1, createdAt: -1 }),
        db.collection<CouponRecord>('coupons').createIndex({ ownerUserId: 1, validUntil: 1 }),
        db.collection<CouponUsageRecord>('coupon_usage').createIndex({ ownerUserId: 1, usageId: 1 }, { unique: true }),
        db.collection<CouponUsageRecord>('coupon_usage').createIndex({ ownerUserId: 1, couponCode: 1, usedAt: -1 }),
        db.collection<CouponUsageRecord>('coupon_usage').createIndex({ ownerUserId: 1, userEmail: 1, couponCode: 1 }),
        db.collection<CouponActivityLogRecord>('coupon_activity_logs').createIndex({ ownerUserId: 1, logId: 1 }, { unique: true }),
        db.collection<CouponActivityLogRecord>('coupon_activity_logs').createIndex({ ownerUserId: 1, couponCode: 1, timestamp: -1 }),
      ]);
    })();
  }

  await indexesReadyPromise;
}

export class CouponService {
  constructor(private readonly ownerUserId: string) {}

  private async getDb() {
    await ensureIndexes();
    return getMongoDb(COUPONS_DB_NAME);
  }

  async ensureCouponSheets(): Promise<void> {
    await this.getDb();
  }

  async logActivity(
    couponCode: string,
    action: string,
    userType: 'Admin' | 'Client' | 'System',
    details: string
  ): Promise<void> {
    const db = await this.getDb();
    await db.collection<CouponActivityLogRecord>('coupon_activity_logs').insertOne({
      ownerUserId: this.ownerUserId,
      logId: `LOG_${Date.now()}_${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      couponCode,
      action,
      userType,
      details,
      timestamp: new Date().toISOString(),
    });
  }

  async getAllCoupons(): Promise<Coupon[]> {
    await this.ensureCouponSheets();
    const db = await this.getDb();
    const rows = await db
      .collection<CouponRecord>('coupons')
      .find({ ownerUserId: this.ownerUserId })
      .sort({ createdAt: -1 })
      .toArray();

    return rows.map(normalizeCoupon);
  }

  async getCouponByCode(code: string): Promise<Coupon | null> {
    await this.ensureCouponSheets();
    const db = await this.getDb();
    const row = await db.collection<CouponRecord>('coupons').findOne({
      ownerUserId: this.ownerUserId,
      code: code.toUpperCase(),
    });

    return row ? normalizeCoupon(row) : null;
  }

  async createCoupon(coupon: Coupon): Promise<void> {
    await this.ensureCouponSheets();
    const db = await this.getDb();
    const existing = await this.getCouponByCode(coupon.code);
    if (existing) {
      throw new Error(`Coupon code "${coupon.code}" already exists`);
    }

    const record: CouponRecord = {
      ownerUserId: this.ownerUserId,
      id: coupon.id,
      code: coupon.code.toUpperCase(),
      type: coupon.type,
      value: Number(coupon.value),
      minOrderValue: Number(coupon.minOrderValue || 0),
      maxDiscount: Number(coupon.maxDiscount || 0),
      validFrom: coupon.validFrom || '',
      validUntil: coupon.validUntil || '',
      usageLimit: Number(coupon.usageLimit || 0),
      usageLimitPerUser: Number(coupon.usageLimitPerUser || 0),
      usageCount: Number(coupon.usageCount || 0),
      applicableProducts: Array.isArray(coupon.applicableProducts) ? coupon.applicableProducts : [],
      applicableCategories: Array.isArray(coupon.applicableCategories) ? coupon.applicableCategories : [],
      userType: coupon.userType || 'all',
      allowedEmails: Array.isArray(coupon.allowedEmails) ? coupon.allowedEmails : [],
      stackable: Boolean(coupon.stackable),
      applyOnSale: Boolean(coupon.applyOnSale),
      description: coupon.description || '',
      createdAt: coupon.createdAt,
      createdBy: coupon.createdBy,
    };

    await db.collection<CouponRecord>('coupons').insertOne(record);
    await this.logActivity(record.code, 'Coupon Created', 'Admin', `Created coupon ${record.code}`);
  }

  async updateCoupon(code: string, updates: Partial<Coupon>): Promise<void> {
    await this.ensureCouponSheets();
    const db = await this.getDb();
    const existing = await this.getCouponByCode(code);

    if (!existing) {
      throw new Error(`Coupon "${code}" not found`);
    }

    const setUpdate: Partial<CouponRecord> = {};
    if (updates.type !== undefined) setUpdate.type = updates.type;
    if (updates.value !== undefined) setUpdate.value = Number(updates.value);
    if (updates.minOrderValue !== undefined) setUpdate.minOrderValue = Number(updates.minOrderValue);
    if (updates.maxDiscount !== undefined) setUpdate.maxDiscount = Number(updates.maxDiscount);
    if (updates.validFrom !== undefined) setUpdate.validFrom = updates.validFrom;
    if (updates.validUntil !== undefined) setUpdate.validUntil = updates.validUntil;
    if (updates.usageLimit !== undefined) setUpdate.usageLimit = Number(updates.usageLimit);
    if (updates.usageLimitPerUser !== undefined) setUpdate.usageLimitPerUser = Number(updates.usageLimitPerUser);
    if (updates.usageCount !== undefined) setUpdate.usageCount = Number(updates.usageCount);
    if (updates.applicableProducts !== undefined) setUpdate.applicableProducts = updates.applicableProducts;
    if (updates.applicableCategories !== undefined) setUpdate.applicableCategories = updates.applicableCategories;
    if (updates.userType !== undefined) setUpdate.userType = updates.userType;
    if (updates.allowedEmails !== undefined) setUpdate.allowedEmails = updates.allowedEmails;
    if (updates.stackable !== undefined) setUpdate.stackable = Boolean(updates.stackable);
    if (updates.applyOnSale !== undefined) setUpdate.applyOnSale = Boolean(updates.applyOnSale);
    if (updates.description !== undefined) setUpdate.description = updates.description;

    await db.collection<CouponRecord>('coupons').updateOne(
      { ownerUserId: this.ownerUserId, code: code.toUpperCase() },
      { $set: setUpdate }
    );
    await this.logActivity(code.toUpperCase(), 'Coupon Updated', 'Admin', `Updated coupon ${code.toUpperCase()}`);
  }

  async deleteCoupon(code: string): Promise<void> {
    await this.ensureCouponSheets();
    const db = await this.getDb();
    const result = await db.collection<CouponRecord>('coupons').deleteOne({
      ownerUserId: this.ownerUserId,
      code: code.toUpperCase(),
    });

    if (result.deletedCount === 0) {
      throw new Error(`Coupon "${code}" not found`);
    }

    await this.logActivity(code.toUpperCase(), 'Coupon Deleted', 'Admin', `Deleted coupon ${code.toUpperCase()}`);
  }

  async duplicateCoupon(code: string, newCode: string): Promise<void> {
    const coupon = await this.getCouponByCode(code);
    if (!coupon) {
      throw new Error(`Coupon "${code}" not found`);
    }

    const duplicate: Coupon = {
      ...coupon,
      code: newCode.toUpperCase(),
      id: `CPN-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
      usageCount: 0,
      createdAt: new Date().toISOString(),
    };

    await this.createCoupon(duplicate);
  }

  async recordCouponUsage(
    couponCode: string,
    usageData: {
      userId?: string;
      userEmail?: string;
      orderAmount: number;
      discountAmount: number;
      finalAmount: number;
    }
  ): Promise<void> {
    await this.ensureCouponSheets();
    const db = await this.getDb();
    const coupon = await this.getCouponByCode(couponCode);
    if (!coupon) {
      throw new Error(`Coupon "${couponCode}" not found`);
    }

    await db.collection<CouponUsageRecord>('coupon_usage').insertOne({
      ownerUserId: this.ownerUserId,
      usageId: `USE_${Date.now()}_${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      couponCode: coupon.code.toUpperCase(),
      userId: usageData.userId || '',
      userEmail: usageData.userEmail || '',
      orderAmount: Number(usageData.orderAmount),
      discountAmount: Number(usageData.discountAmount),
      finalAmount: Number(usageData.finalAmount),
      usedAt: new Date().toISOString(),
    });

    await db.collection<CouponRecord>('coupons').updateOne(
      { ownerUserId: this.ownerUserId, code: coupon.code.toUpperCase() },
      { $inc: { usageCount: 1 } }
    );

    await this.logActivity(coupon.code.toUpperCase(), 'Coupon Used', 'Client', `Recorded usage for coupon ${coupon.code.toUpperCase()}`);
  }

  async getCouponUsageStats(code: string): Promise<CouponUsageStats> {
    const coupon = await this.getCouponByCode(code);
    if (!coupon) {
      throw new Error(`Coupon "${code}" not found`);
    }

    const db = await this.getDb();
    const usageRecords = await db
      .collection<CouponUsageRecord>('coupon_usage')
      .find({ ownerUserId: this.ownerUserId, couponCode: code.toUpperCase() })
      .sort({ usedAt: -1 })
      .toArray();

    const usagePerUser = new Map<string, number>();
    for (const record of usageRecords) {
      const key = record.userEmail || record.userId || 'unknown';
      usagePerUser.set(key, (usagePerUser.get(key) || 0) + 1);
    }

    return {
      code: code.toUpperCase(),
      totalUsed: coupon.usageCount || 0,
      usageLimit: coupon.usageLimit || 0,
      usageLimitPerUser: coupon.usageLimitPerUser || 0,
      usagePerUser,
      recentUsage: usageRecords.slice(0, 10).map((record) => ({
        userId: record.userId,
        email: record.userEmail,
        orderAmount: record.orderAmount,
        discountAmount: record.discountAmount,
        finalAmount: record.finalAmount,
        usedAt: record.usedAt,
      })),
    };
  }

  async getActivityLogs(limit = 20): Promise<CouponActivityLogView[]> {
    await this.ensureCouponSheets();
    const db = await this.getDb();
    const rows = await db
      .collection<CouponActivityLogRecord>('coupon_activity_logs')
      .find({ ownerUserId: this.ownerUserId })
      .sort({ timestamp: -1 })
      .limit(Math.max(1, Math.min(limit, 100)))
      .toArray();

    return rows.map((row) => ({
      logId: row.logId,
      couponCode: row.couponCode,
      action: row.action,
      userType: row.userType,
      details: row.details,
      timestamp: row.timestamp,
    }));
  }

  async getApplicableCoupons(filter: ApplicableCouponFilter): Promise<Coupon[]> {
    const coupons = await this.getAllCoupons();
    const products = Array.isArray(filter.products) ? filter.products : [];
    const categories = Array.isArray(filter.categories) ? filter.categories : [];

    return coupons.filter((coupon) => {
      if (coupon.status !== 'active') return false;

      if (coupon.userType && coupon.userType !== 'all' && coupon.userType !== filter.userType) {
        return false;
      }

      if (coupon.allowedEmails && coupon.allowedEmails.length > 0) {
        if (filter.userEmail && !coupon.allowedEmails.includes(filter.userEmail)) {
          return false;
        }
        if (!filter.userEmail) {
          return false;
        }
      }

      if (coupon.applicableProducts && coupon.applicableProducts.length > 0) {
        if (!products.some((product) => coupon.applicableProducts?.includes(product))) {
          return false;
        }
      }

      if (coupon.applicableCategories && coupon.applicableCategories.length > 0) {
        if (!categories.some((category) => coupon.applicableCategories?.includes(category))) {
          return false;
        }
      }

      if (filter.orderAmount !== undefined && coupon.minOrderValue && filter.orderAmount < coupon.minOrderValue) {
        return false;
      }

      if (coupon.usageLimit && coupon.usageCount && coupon.usageCount >= coupon.usageLimit) {
        return false;
      }

      return true;
    });
  }

  async getDebugSummary(): Promise<{
    success: boolean;
    database: string;
    schemaVersion: string;
    ownerUserId: string;
    collections: {
      coupons: number;
      coupon_usage: number;
      coupon_activity_logs: number;
    };
    note: string;
  }> {
    const db = await this.getDb();
    const [couponCount, usageCount, activityCount] = await Promise.all([
      db.collection<CouponRecord>('coupons').countDocuments({ ownerUserId: this.ownerUserId }),
      db.collection<CouponUsageRecord>('coupon_usage').countDocuments({ ownerUserId: this.ownerUserId }),
      db.collection<CouponActivityLogRecord>('coupon_activity_logs').countDocuments({ ownerUserId: this.ownerUserId }),
    ]);

    return {
      success: true,
      database: db.databaseName,
      schemaVersion: COUPONS_SCHEMA_VERSION,
      ownerUserId: this.ownerUserId,
      collections: {
        coupons: couponCount,
        coupon_usage: usageCount,
        coupon_activity_logs: activityCount,
      },
      note: 'Coupons data is stored in MongoDB with per-user isolation.',
    };
  }
}

export async function getCouponService(): Promise<CouponService> {
  throw new Error('Deprecated: Use CouponService constructor directly from API routes');
}
