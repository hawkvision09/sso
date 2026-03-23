import { google } from 'googleapis';
import { getAppContainer } from './service';

/**
 * Coupon data structure
 */
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

interface CouponUsageRecord {
    couponCode: string;
    userId?: string;
    userEmail?: string;
    orderAmount: number;
    discountAmount: number;
    finalAmount: number;
    usedAt: string;
}

/**
 * Coupon service that operates on SSO-managed storage
 */
export class CouponService {
    private sheets: any;
    private spreadsheetId: string;

    constructor(accessToken: string, spreadsheetId: string) {
        const auth = new google.auth.OAuth2();
        auth.setCredentials({ access_token: accessToken });
        this.sheets = google.sheets({ version: 'v4', auth });
        this.spreadsheetId = spreadsheetId;
    }

    /**
     * Ensure coupon sheets exist
     */
    async ensureCouponSheets(): Promise<void> {
        const metadata = await this.sheets.spreadsheets.get({
            spreadsheetId: this.spreadsheetId,
        });

        const existingSheets = metadata.data.sheets || [];
        const sheetNames = new Set(existingSheets.map((s: any) => s.properties?.title));

        const requests: any[] = [];

        if (!sheetNames.has('Coupons')) {
            requests.push({
                addSheet: {
                    properties: { title: 'Coupons' },
                },
            });
        }

        if (!sheetNames.has('Usage')) {
            requests.push({
                addSheet: {
                    properties: { title: 'Usage' },
                },
            });
        }

        // Keep only application-managed tabs by deleting extras (e.g., default Sheet1).
        for (const sheet of existingSheets) {
            const title = sheet.properties?.title;
            const sheetId = sheet.properties?.sheetId;
            if (!sheetId) continue;

            if (title !== 'Coupons' && title !== 'Usage') {
                requests.push({
                    deleteSheet: { sheetId },
                });
            }
        }

        if (requests.length > 0) {
            await this.sheets.spreadsheets.batchUpdate({
                spreadsheetId: this.spreadsheetId,
                requestBody: { requests },
            });
        }

        // Ensure headers are always correct.
        await this.sheets.spreadsheets.values.update({
            spreadsheetId: this.spreadsheetId,
            range: 'Coupons!A1:T1',
            valueInputOption: 'RAW',
            requestBody: {
                values: [
                    [
                        'id', 'code', 'type', 'value', 'minOrderValue', 'maxDiscount',
                        'validFrom', 'validUntil', 'usageLimit', 'usageLimitPerUser',
                        'usageCount', 'applicableProducts', 'applicableCategories',
                        'userType', 'allowedEmails', 'stackable', 'applyOnSale',
                        'description', 'createdAt', 'createdBy'
                    ],
                ],
            },
        });

        await this.sheets.spreadsheets.values.update({
            spreadsheetId: this.spreadsheetId,
            range: 'Usage!A1:G1',
            valueInputOption: 'RAW',
            requestBody: {
                values: [
                    ['couponCode', 'userId', 'userEmail', 'orderAmount', 'discountAmount', 'finalAmount', 'usedAt'],
                ],
            },
        });
    }

    /**
     * Get all coupons
     */
    async getAllCoupons(): Promise<Coupon[]> {
        await this.ensureCouponSheets();

        const response = await this.sheets.spreadsheets.values.get({
            spreadsheetId: this.spreadsheetId,
            range: 'Coupons!A2:T',
        });

        const rows = response.data.values || [];
        return rows.map((row: any[]) => this.rowToCoupon(row));
    }

    /**
     * Get coupon by code
     */
    async getCouponByCode(code: string): Promise<Coupon | null> {
        const coupons = await this.getAllCoupons();
        return coupons.find((c) => c.code.toUpperCase() === code.toUpperCase()) || null;
    }

    /**
     * Create new coupon
     */
    async createCoupon(coupon: Coupon): Promise<void> {
        await this.ensureCouponSheets();

        // Check if code already exists
        const existing = await this.getCouponByCode(coupon.code);
        if (existing) {
            throw new Error(`Coupon code "${coupon.code}" already exists`);
        }

        const row = this.couponToRow(coupon);
        await this.sheets.spreadsheets.values.append({
            spreadsheetId: this.spreadsheetId,
            range: 'Coupons!A:T',
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values: [row],
            },
        });
    }

    /**
     * Update coupon
     */
    async updateCoupon(code: string, updates: Partial<Coupon>): Promise<void> {
        const coupons = await this.getAllCoupons();
        const index = coupons.findIndex((c) => c.code.toUpperCase() === code.toUpperCase());

        if (index === -1) {
            throw new Error(`Coupon "${code}" not found`);
        }

        const coupon = { ...coupons[index], ...updates };
        const row = this.couponToRow(coupon);
        const rowNumber = index + 2; // +1 for header, +1 for 1-based indexing

        await this.sheets.spreadsheets.values.update({
            spreadsheetId: this.spreadsheetId,
            range: `Coupons!A${rowNumber}:T${rowNumber}`,
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values: [row],
            },
        });
    }

    /**
     * Delete coupon
     */
    async deleteCoupon(code: string): Promise<void> {
        const coupons = await this.getAllCoupons();
        const index = coupons.findIndex((c) => c.code.toUpperCase() === code.toUpperCase());

        if (index === -1) {
            throw new Error(`Coupon "${code}" not found`);
        }

        const rowNumber = index + 2;

        const metadata = await this.sheets.spreadsheets.get({
            spreadsheetId: this.spreadsheetId,
        });

        const couponsSheet = metadata.data.sheets?.find(
            (sheet: any) => sheet.properties?.title === 'Coupons'
        );

        if (!couponsSheet || !couponsSheet.properties?.sheetId) {
            throw new Error('Coupons sheet not found');
        }

        await this.sheets.spreadsheets.batchUpdate({
            spreadsheetId: this.spreadsheetId,
            requestBody: {
                requests: [
                    {
                        deleteDimension: {
                            range: {
                                sheetId: couponsSheet.properties.sheetId,
                                dimension: 'ROWS',
                                startIndex: rowNumber - 1,
                                endIndex: rowNumber,
                            },
                        },
                    },
                ],
            },
        });
    }

    /**
     * Duplicate coupon
     */
    async duplicateCoupon(code: string, newCode: string): Promise<void> {
        const coupon = await this.getCouponByCode(code);
        if (!coupon) {
            throw new Error(`Coupon "${code}" not found`);
        }

        const duplicate: Coupon = {
            ...coupon,
            code: newCode.toUpperCase(),
            id: `CPN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            usageCount: 0,
            createdAt: new Date().toISOString(),
        };

        await this.createCoupon(duplicate);
    }

    /**
     * Record coupon usage
     */
    async recordCouponUsage(couponCode: string, usageData: {
        userId?: string;
        userEmail?: string;
        orderAmount: number;
        discountAmount: number;
        finalAmount: number;
    }): Promise<void> {
        await this.ensureCouponSheets();

        // Get current coupon and increment usage
        const coupon = await this.getCouponByCode(couponCode);
        if (!coupon) {
            throw new Error(`Coupon "${couponCode}" not found`);
        }

        // Update usage count
        const newUsageCount = (coupon.usageCount || 0) + 1;
        await this.updateCoupon(couponCode, { usageCount: newUsageCount });

        // Log usage
        const usageRow = [
            couponCode,
            usageData.userId || '',
            usageData.userEmail || '',
            usageData.orderAmount,
            usageData.discountAmount,
            usageData.finalAmount,
            new Date().toISOString(),
        ];

        await this.sheets.spreadsheets.values.append({
            spreadsheetId: this.spreadsheetId,
            range: 'Usage!A:G',
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values: [usageRow],
            },
        });
    }

    /**
     * Get usage stats for a coupon
     */
    async getCouponUsageStats(code: string): Promise<any> {
        const coupon = await this.getCouponByCode(code);
        if (!coupon) {
            throw new Error(`Coupon "${code}" not found`);
        }

        // Get usage records
        const response = await this.sheets.spreadsheets.values.get({
            spreadsheetId: this.spreadsheetId,
            range: 'Usage!A2:G',
        });

        const rows = response.data.values || [];
        const usageRecords = rows.filter((row: any[]) => row[0]?.toUpperCase() === code.toUpperCase());

        return {
            code,
            totalUsed: coupon.usageCount || 0,
            usageLimit: coupon.usageLimit || 0,
            usageLimitPerUser: coupon.usageLimitPerUser || 0,
            usagePerUser: new Map(
                usageRecords
                    .map((row: any[]) => [row[2] || row[1] || 'unknown', row])
                    .reduce((acc: any, [key, row]: any[]) => {
                        const existing = acc.find((item: any) => item[0] === key);
                        if (existing) {
                            existing[1] = (existing[1] || 0) + 1;
                        } else {
                            acc.push([key, 1]);
                        }
                        return acc;
                    }, [])
            ),
            recentUsage: usageRecords.slice(-10).map((row: any[]) => ({
                userId: row[1],
                email: row[2],
                orderAmount: parseFloat(row[3]),
                discountAmount: parseFloat(row[4]),
                finalAmount: parseFloat(row[5]),
                usedAt: row[6],
            })),
        };
    }

    /**
     * Get applicable coupons for filter criteria
     */
    async getApplicableCoupons(filter: {
        userEmail?: string;
        userType?: string;
        products?: string[];
        categories?: string[];
        orderAmount?: number;
    }): Promise<Coupon[]> {
        const coupons = await this.getAllCoupons();

        return coupons.filter((coupon) => {
            // Check status
            if (coupon.status !== 'active') return false;

            // Check user type
            if (coupon.userType && coupon.userType !== 'all' && coupon.userType !== filter.userType) {
                return false;
            }

            // Check allowed emails
            if (coupon.allowedEmails && coupon.allowedEmails.length > 0) {
                if (filter.userEmail && !coupon.allowedEmails.includes(filter.userEmail)) {
                    return false;
                }
            }

            // Check applicable products
            if (coupon.applicableProducts && coupon.applicableProducts.length > 0) {
                if (!filter.products?.some((p) => coupon.applicableProducts?.includes(p))) {
                    return false;
                }
            }

            // Check applicable categories
            if (coupon.applicableCategories && coupon.applicableCategories.length > 0) {
                if (!filter.categories?.some((c) => coupon.applicableCategories?.includes(c))) {
                    return false;
                }
            }

            // Check min order value
            if (filter.orderAmount && coupon.minOrderValue && filter.orderAmount < coupon.minOrderValue) {
                return false;
            }

            // Check usage limits
            if (coupon.usageLimit && coupon.usageCount && coupon.usageCount >= coupon.usageLimit) {
                return false;
            }

            return true;
        });
    }

    /**
     * Calculate coupon status
     */
    private calculateStatus(validFrom: string, validUntil: string): 'active' | 'expired' | 'upcoming' {
        const now = new Date();
        const from = validFrom ? new Date(validFrom) : null;
        const until = validUntil ? new Date(validUntil) : null;

        if (from && now < from) return 'upcoming';
        if (until && now > until) return 'expired';
        return 'active';
    }

    /**
     * Convert row to coupon object
     */
    private rowToCoupon(row: any[]): Coupon {
        const validFrom = row[6] || '';
        const validUntil = row[7] || '';

        return {
            id: row[0] || '',
            code: row[1] || '',
            type: row[2] || 'percentage',
            value: parseFloat(row[3]) || 0,
            minOrderValue: parseFloat(row[4]) || 0,
            maxDiscount: parseFloat(row[5]) || 0,
            validFrom,
            validUntil,
            usageLimit: parseInt(row[8]) || 0,
            usageLimitPerUser: parseInt(row[9]) || 0,
            usageCount: parseInt(row[10]) || 0,
            status: this.calculateStatus(validFrom, validUntil),
            applicableProducts: row[11] ? row[11].split(',').map((s: string) => s.trim()) : [],
            applicableCategories: row[12] ? row[12].split(',').map((s: string) => s.trim()) : [],
            userType: row[13] || 'all',
            allowedEmails: row[14] ? row[14].split(',').map((s: string) => s.trim()) : [],
            stackable: row[15] === 'TRUE',
            applyOnSale: row[16] === 'TRUE',
            description: row[17] || '',
            createdAt: row[18] || '',
            createdBy: row[19] || '',
        };
    }

    /**
     * Convert coupon object to spreadsheet row
     */
    private couponToRow(coupon: Coupon): any[] {
        return [
            coupon.id,
            coupon.code,
            coupon.type,
            coupon.value,
            coupon.minOrderValue || 0,
            coupon.maxDiscount || 0,
            coupon.validFrom,
            coupon.validUntil,
            coupon.usageLimit || 0,
            coupon.usageLimitPerUser || 0,
            coupon.usageCount || 0,
            coupon.applicableProducts?.join(', ') || '',
            coupon.applicableCategories?.join(', ') || '',
            coupon.userType || 'all',
            coupon.allowedEmails?.join(', ') || '',
            coupon.stackable ? 'TRUE' : 'FALSE',
            coupon.applyOnSale ? 'TRUE' : 'FALSE',
            coupon.description || '',
            coupon.createdAt,
            coupon.createdBy,
        ];
    }
}

/**
 * Get coupon service for a tenant and app
 */
export async function getCouponService(userId: string, tenantEmail: string): Promise<CouponService> {
    throw new Error('Deprecated: Use CouponService constructor directly from API routes');
}
