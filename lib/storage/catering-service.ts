import { getMongoDb } from '@/lib/db/mongo';

const CATERING_DB_NAME = 'catering';
const CATERING_SCHEMA_VERSION = 'v2-mongo';

type ProposalStatus = 'Draft' | 'Sent' | 'Accepted' | 'Completed' | 'Cancelled';
type MenuSelectionItem = Record<string, unknown>;

interface ProposalRecord {
  ownerUserId: string;
  proposalId: string;
  clientName: string;
  contactNumber: string;
  email: string;
  eventDate: string;
  guestCount: number;
  eventType: string;
  status: ProposalStatus;
  createdDate: string;
  currentVersion: number;
  proposalLink: string;
  finalAmount: number;
  discountPercent: number;
  advanceAmount: number;
  isLocked: boolean;
  completed: boolean;
  cancelled: boolean;
}

interface ProposalVersionRecord {
  ownerUserId: string;
  versionId: string;
  proposalId: string;
  versionNumber: number;
  menuItems: MenuSelectionItem[];
  totalPrice: number;
  createdDate: string;
  createdBy: string;
}

interface MenuItemRecord {
  ownerUserId: string;
  itemId: string;
  category: string;
  itemName: string;
  description: string;
  isActive: boolean;
  price?: number;
  unit?: string;
}

interface ActivityLogRecord {
  ownerUserId: string;
  logId: string;
  proposalId: string;
  action: string;
  userType: 'Admin' | 'Client';
  details: string;
  timestamp: string;
}

interface ProposalInput {
  proposalId: string;
  clientName: string;
  contactNumber: string;
  email?: string;
  eventDate: string;
  guestCount: number;
  eventType: string;
  createdBy?: string;
}

interface ProposalDetailsUpdateInput {
  clientName: string;
  contactNumber: string;
  email?: string;
  eventDate: string;
  guestCount: number;
  eventType: string;
}

interface ProposalView {
  proposalId: string;
  clientName: string;
  contactNumber: string;
  email: string;
  eventDate: string;
  guestCount: number;
  eventType: string;
  status: ProposalStatus;
  createdDate: string;
  currentVersion: number;
  proposalLink: string;
  finalAmount: number;
  discountPercent: number;
  advanceAmount: number;
  isLocked: boolean;
  completed: boolean;
  cancelled: boolean;
}

interface ProposalVersionView {
  versionId: string;
  proposalId: string;
  versionNumber: number;
  menuItems: MenuSelectionItem[];
  totalPrice: number;
  createdDate: string;
  createdBy: string;
}

interface MenuItemView {
  itemId: string;
  category: string;
  itemName: string;
  description: string;
  isActive: boolean;
}

interface ActivityLogView {
  logId: string;
  proposalId: string;
  action: string;
  userType: 'Admin' | 'Client';
  details: string;
  timestamp: string;
}

const DEFAULT_MENU_ITEMS: Omit<MenuItemRecord, 'ownerUserId'>[] = [
  { itemId: 'ITEM_001', category: 'Appetizer', itemName: 'Vegetable Samosa (2 pcs)', description: 'Crispy pastry filled with spiced potatoes and peas', isActive: true, price: 50, unit: 'per plate' },
  { itemId: 'ITEM_002', category: 'Appetizer', itemName: 'Chicken Tikka', description: 'Tender chicken pieces marinated in yogurt and spices', isActive: true, price: 250, unit: 'per plate' },
  { itemId: 'ITEM_003', category: 'Appetizer', itemName: 'Paneer Tikka', description: 'Cottage cheese cubes grilled with spices', isActive: true, price: 220, unit: 'per plate' },
  { itemId: 'ITEM_004', category: 'Appetizer', itemName: 'Spring Rolls', description: 'Crispy vegetable rolls served with chili sauce', isActive: true, price: 150, unit: 'per plate' },
  { itemId: 'ITEM_005', category: 'Main Course', itemName: 'Butter Chicken', description: 'Chicken simmered in a rich tomato and butter sauce', isActive: true, price: 350, unit: 'per person' },
  { itemId: 'ITEM_006', category: 'Main Course', itemName: 'Paneer Butter Masala', description: 'Cottage cheese in creamy tomato gravy', isActive: true, price: 300, unit: 'per person' },
  { itemId: 'ITEM_007', category: 'Main Course', itemName: 'Dal Makhani', description: 'Creamy black lentils slow-cooked overnight', isActive: true, price: 200, unit: 'per person' },
  { itemId: 'ITEM_008', category: 'Main Course', itemName: 'Chicken Biryani', description: 'Aromatic basmati rice cooked with chicken and spices', isActive: true, price: 280, unit: 'per person' },
  { itemId: 'ITEM_009', category: 'Main Course', itemName: 'Veg Biryani', description: 'Fragrant rice with mixed vegetables and spices', isActive: true, price: 200, unit: 'per person' },
  { itemId: 'ITEM_010', category: 'Breads', itemName: 'Butter Naan', description: 'Soft leavened bread brushed with butter', isActive: true, price: 40, unit: 'per piece' },
  { itemId: 'ITEM_011', category: 'Breads', itemName: 'Garlic Naan', description: 'Naan topped with minced garlic and coriander', isActive: true, price: 50, unit: 'per piece' },
  { itemId: 'ITEM_012', category: 'Breads', itemName: 'Tandoori Roti', description: 'Whole wheat bread baked in clay oven', isActive: true, price: 30, unit: 'per piece' },
  { itemId: 'ITEM_013', category: 'Dessert', itemName: 'Gulab Jamun (2 pcs)', description: 'Sweet milk dumplings in rose syrup', isActive: true, price: 80, unit: 'per plate' },
  { itemId: 'ITEM_014', category: 'Dessert', itemName: 'Rasmalai (2 pcs)', description: 'Soft cheese patties in sweet saffron milk', isActive: true, price: 100, unit: 'per plate' },
  { itemId: 'ITEM_015', category: 'Dessert', itemName: 'Ice Cream', description: 'Vanilla bean or Chocolate fudge', isActive: true, price: 60, unit: 'per person' },
  { itemId: 'ITEM_016', category: 'Beverage', itemName: 'Masala Chai', description: 'Spiced Indian tea', isActive: true, price: 30, unit: 'per cup' },
  { itemId: 'ITEM_017', category: 'Beverage', itemName: 'Fresh Lime Soda', description: 'Refreshing lime drink (Sweet/Salt)', isActive: true, price: 80, unit: 'per glass' },
  { itemId: 'ITEM_018', category: 'Beverage', itemName: 'Mineral Water', description: '500ml bottle', isActive: true, price: 20, unit: 'per bottle' },
];

let indexesReadyPromise: Promise<void> | null = null;

async function ensureIndexes(): Promise<void> {
  if (!indexesReadyPromise) {
    indexesReadyPromise = (async () => {
      const db = await getMongoDb(CATERING_DB_NAME);
      await Promise.all([
        db.collection<ProposalRecord>('proposals').createIndex({ ownerUserId: 1, proposalId: 1 }, { unique: true }),
        db.collection<ProposalRecord>('proposals').createIndex({ ownerUserId: 1, createdDate: -1 }),
        db.collection<ProposalRecord>('proposals').createIndex({ ownerUserId: 1, status: 1 }),
        db.collection<ProposalVersionRecord>('proposal_versions').createIndex({ ownerUserId: 1, versionId: 1 }, { unique: true }),
        db.collection<ProposalVersionRecord>('proposal_versions').createIndex({ ownerUserId: 1, proposalId: 1, versionNumber: -1 }),
        db.collection<MenuItemRecord>('menu_items').createIndex({ ownerUserId: 1, itemId: 1 }, { unique: true }),
        db.collection<ActivityLogRecord>('activity_logs').createIndex({ ownerUserId: 1, logId: 1 }, { unique: true }),
        db.collection<ActivityLogRecord>('activity_logs').createIndex({ ownerUserId: 1, proposalId: 1, timestamp: -1 }),
      ]);
    })();
  }

  await indexesReadyPromise;
}

function sanitizeProposal(record: ProposalRecord): ProposalView {
  return {
    proposalId: record.proposalId,
    clientName: record.clientName,
    contactNumber: record.contactNumber,
    email: record.email,
    eventDate: record.eventDate,
    guestCount: record.guestCount,
    eventType: record.eventType,
    status: record.status,
    createdDate: record.createdDate,
    currentVersion: record.currentVersion,
    proposalLink: record.proposalLink,
    finalAmount: record.finalAmount,
    discountPercent: record.discountPercent,
    advanceAmount: record.advanceAmount,
    isLocked: record.isLocked,
    completed: record.completed,
    cancelled: record.cancelled,
  };
}

function sanitizeProposalVersion(record: ProposalVersionRecord): ProposalVersionView {
  return {
    versionId: record.versionId,
    proposalId: record.proposalId,
    versionNumber: record.versionNumber,
    menuItems: Array.isArray(record.menuItems) ? record.menuItems : [],
    totalPrice: record.totalPrice,
    createdDate: record.createdDate,
    createdBy: record.createdBy,
  };
}

function sanitizeMenuItem(record: MenuItemRecord): MenuItemView {
  return {
    itemId: record.itemId,
    category: record.category,
    itemName: record.itemName,
    description: record.description,
    isActive: record.isActive,
  };
}

function sanitizeActivityLog(record: ActivityLogRecord): ActivityLogView {
  return {
    logId: record.logId,
    proposalId: record.proposalId,
    action: record.action,
    userType: record.userType,
    details: record.details,
    timestamp: record.timestamp,
  };
}

export class CateringService {
  constructor(private readonly ownerUserId: string) {}

  private async getDb() {
    await ensureIndexes();
    return getMongoDb(CATERING_DB_NAME);
  }

  async ensureSheets(): Promise<void> {
    const db = await this.getDb();
    const menuCollection = db.collection<MenuItemRecord>('menu_items');
    const existingCount = await menuCollection.countDocuments({ ownerUserId: this.ownerUserId }, { limit: 1 });

    if (existingCount > 0) {
      return;
    }

    try {
      await menuCollection.insertMany(
        DEFAULT_MENU_ITEMS.map((item) => ({
          ownerUserId: this.ownerUserId,
          ...item,
        })),
        { ordered: false }
      );
    } catch (error: unknown) {
      if (!(error instanceof Error) || !('code' in error) || error.code !== 11000) {
        throw error;
      }
    }
  }

  async logActivity(proposalId: string, action: string, userType: 'Admin' | 'Client', details: string): Promise<void> {
    const db = await this.getDb();
    const logCollection = db.collection<ActivityLogRecord>('activity_logs');
    const now = new Date().toISOString();
    const logId = `LOG_${Date.now()}_${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    await logCollection.insertOne({
      ownerUserId: this.ownerUserId,
      logId,
      proposalId,
      action,
      userType,
      details,
      timestamp: now,
    });
  }

  async createProposal(data: ProposalInput, appBaseUrl?: string): Promise<string> {
    await this.ensureSheets();
    const db = await this.getDb();
    const proposalCollection = db.collection<ProposalRecord>('proposals');
    const now = new Date().toISOString();
    const proposalLink = appBaseUrl ? `${appBaseUrl.replace(/\/$/, '')}/proposal/${data.proposalId}` : '';

    await proposalCollection.insertOne({
      ownerUserId: this.ownerUserId,
      proposalId: data.proposalId,
      clientName: data.clientName,
      contactNumber: data.contactNumber,
      email: data.email || '',
      eventDate: data.eventDate,
      guestCount: data.guestCount,
      eventType: data.eventType,
      status: 'Draft',
      createdDate: now,
      currentVersion: 1,
      proposalLink,
      finalAmount: 0,
      discountPercent: 0,
      advanceAmount: 0,
      isLocked: false,
      completed: false,
      cancelled: false,
    });

    await this.logActivity(data.proposalId, 'Proposal Created', 'Admin', `Created proposal for ${data.clientName}`);
    return data.proposalId;
  }

  async getProposal(proposalId: string): Promise<ProposalView | null> {
    await this.ensureSheets();
    const db = await this.getDb();
    const record = await db.collection<ProposalRecord>('proposals').findOne({
      ownerUserId: this.ownerUserId,
      proposalId,
    });

    return record ? sanitizeProposal(record) : null;
  }

  async getAllProposals(): Promise<ProposalView[]> {
    await this.ensureSheets();
    const db = await this.getDb();
    const records = await db
      .collection<ProposalRecord>('proposals')
      .find({ ownerUserId: this.ownerUserId })
      .sort({ createdDate: -1 })
      .toArray();

    return records.map(sanitizeProposal);
  }

  async updateProposalDetails(proposalId: string, data: ProposalDetailsUpdateInput): Promise<boolean> {
    await this.ensureSheets();
    const db = await this.getDb();
    const result = await db.collection<ProposalRecord>('proposals').updateOne(
      {
        ownerUserId: this.ownerUserId,
        proposalId,
      },
      {
        $set: {
          clientName: data.clientName,
          contactNumber: data.contactNumber,
          email: data.email || '',
          eventDate: data.eventDate,
          guestCount: data.guestCount,
          eventType: data.eventType,
        },
      }
    );

    if (result.matchedCount === 0) {
      return false;
    }

    await this.logActivity(proposalId, 'Event Details Updated', 'Admin', 'Updated proposal event details');
    return true;
  }

  async getMenuItems(): Promise<MenuItemView[]> {
    await this.ensureSheets();
    const db = await this.getDb();
    const records = await db
      .collection<MenuItemRecord>('menu_items')
      .find({ ownerUserId: this.ownerUserId, isActive: true })
      .sort({ category: 1, itemName: 1 })
      .toArray();

    return records.map(sanitizeMenuItem);
  }

  async saveProposalVersion(
    proposalId: string,
    menuItems: MenuSelectionItem[],
    totalPrice: number,
    createdBy: string
  ): Promise<{ versionId: string; versionNumber: number }> {
    await this.ensureSheets();
    const db = await this.getDb();
    const proposalCollection = db.collection<ProposalRecord>('proposals');
    const versionCollection = db.collection<ProposalVersionRecord>('proposal_versions');
    const proposal = await proposalCollection.findOne({
      ownerUserId: this.ownerUserId,
      proposalId,
    });

    if (!proposal) {
      throw new Error('Proposal not found');
    }

    const nextVersion = (proposal.currentVersion || 0) + 1;
    const versionId = `VER_${Date.now()}_${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const now = new Date().toISOString();

    await versionCollection.insertOne({
      ownerUserId: this.ownerUserId,
      versionId,
      proposalId,
      versionNumber: nextVersion,
      menuItems,
      totalPrice,
      createdDate: now,
      createdBy,
    });

    await proposalCollection.updateOne(
      { ownerUserId: this.ownerUserId, proposalId },
      { $set: { currentVersion: nextVersion } }
    );

    await this.logActivity(proposalId, 'Menu Selection Saved', 'Client', `Saved version ${nextVersion}`);
    return { versionId, versionNumber: nextVersion };
  }

  async getLatestProposalVersion(proposalId: string): Promise<ProposalVersionView | null> {
    await this.ensureSheets();
    const db = await this.getDb();
    const record = await db.collection<ProposalVersionRecord>('proposal_versions').findOne(
      {
        ownerUserId: this.ownerUserId,
        proposalId,
      },
      {
        sort: { versionNumber: -1, createdDate: -1 },
      }
    );

    return record ? sanitizeProposalVersion(record) : null;
  }

  async updateProposalNegotiation(proposalId: string, data: {
    finalAmount: number;
    discountPercent: number;
    advanceAmount: number;
    isLocked: boolean;
    status?: string;
  }): Promise<boolean> {
    await this.ensureSheets();
    const db = await this.getDb();
    const nextStatus = data.status as ProposalStatus | undefined;
    const result = await db.collection<ProposalRecord>('proposals').updateOne(
      {
        ownerUserId: this.ownerUserId,
        proposalId,
      },
      {
        $set: {
          finalAmount: Number(data.finalAmount || 0),
          discountPercent: Number(data.discountPercent || 0),
          advanceAmount: Number(data.advanceAmount || 0),
          isLocked: Boolean(data.isLocked),
          ...(nextStatus ? { status: nextStatus } : {}),
        },
      }
    );

    if (result.matchedCount === 0) {
      return false;
    }

    await this.logActivity(proposalId, 'Negotiation Updated', 'Admin', `Updated negotiation details. Locked: ${Boolean(data.isLocked)}`);
    return true;
  }

  async deleteProposal(proposalId: string, status: 'Completed' | 'Cancelled' = 'Completed'): Promise<boolean> {
    await this.ensureSheets();
    const db = await this.getDb();
    const result = await db.collection<ProposalRecord>('proposals').updateOne(
      {
        ownerUserId: this.ownerUserId,
        proposalId,
      },
      {
        $set: {
          status,
          completed: status === 'Completed',
          cancelled: status === 'Cancelled',
        },
      }
    );

    if (result.matchedCount === 0) {
      return false;
    }

    await this.logActivity(proposalId, `Proposal ${status}`, 'Admin', `Proposal marked as ${status.toLowerCase()}`);
    return true;
  }

  async getActivityLogs(): Promise<ActivityLogView[]> {
    await this.ensureSheets();
    const db = await this.getDb();
    const records = await db
      .collection<ActivityLogRecord>('activity_logs')
      .find({ ownerUserId: this.ownerUserId })
      .sort({ timestamp: -1 })
      .toArray();

    return records.map(sanitizeActivityLog);
  }

  async getDebugSummary(): Promise<{
    success: boolean;
    database: string;
    schemaVersion: string;
    ownerUserId: string;
    collections: {
      proposals: number;
      proposal_versions: number;
      menu_items: number;
      activity_logs: number;
    };
    note: string;
  }> {
    await this.ensureSheets();
    const db = await this.getDb();
    const [proposalsCount, versionsCount, menuCount, logsCount] = await Promise.all([
      db.collection<ProposalRecord>('proposals').countDocuments({ ownerUserId: this.ownerUserId }),
      db.collection<ProposalVersionRecord>('proposal_versions').countDocuments({ ownerUserId: this.ownerUserId }),
      db.collection<MenuItemRecord>('menu_items').countDocuments({ ownerUserId: this.ownerUserId }),
      db.collection<ActivityLogRecord>('activity_logs').countDocuments({ ownerUserId: this.ownerUserId }),
    ]);

    return {
      success: true,
      database: db.databaseName,
      schemaVersion: CATERING_SCHEMA_VERSION,
      ownerUserId: this.ownerUserId,
      collections: {
        proposals: proposalsCount,
        proposal_versions: versionsCount,
        menu_items: menuCount,
        activity_logs: logsCount,
      },
      note: 'Catering data is stored in MongoDB with per-user isolation.',
    };
  }
}
