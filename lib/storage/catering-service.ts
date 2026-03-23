import { google } from 'googleapis';

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

export class CateringService {
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

    const required = ['Proposals', 'Proposal_Versions', 'Menu_Master', 'Activity_Log'];
    const requests: any[] = [];

    for (const name of required) {
      if (!sheetNames.has(name)) {
        requests.push({ addSheet: { properties: { title: name } } });
      }
    }

    for (const sheet of existingSheets) {
      const title = sheet.properties?.title;
      const sheetId = sheet.properties?.sheetId;
      if (!sheetId) continue;
      if (!required.includes(title)) {
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
      range: 'Proposals!A1:Q1',
      valueInputOption: 'RAW',
      requestBody: {
        values: [[
          'proposalId', 'clientName', 'contactNumber', 'email', 'eventDate', 'guestCount', 'eventType',
          'status', 'createdDate', 'currentVersion', 'proposalLink', 'finalAmount', 'discountPercent',
          'advanceAmount', 'isLocked', 'completed', 'cancelled',
        ]],
      },
    });

    await this.sheets.spreadsheets.values.update({
      spreadsheetId: this.spreadsheetId,
      range: 'Proposal_Versions!A1:G1',
      valueInputOption: 'RAW',
      requestBody: {
        values: [['versionId', 'proposalId', 'versionNumber', 'menuItems', 'totalPrice', 'createdDate', 'createdBy']],
      },
    });

    await this.sheets.spreadsheets.values.update({
      spreadsheetId: this.spreadsheetId,
      range: 'Menu_Master!A1:E1',
      valueInputOption: 'RAW',
      requestBody: {
        values: [['itemId', 'category', 'itemName', 'description', 'isActive']],
      },
    });

    await this.sheets.spreadsheets.values.update({
      spreadsheetId: this.spreadsheetId,
      range: 'Activity_Log!A1:F1',
      valueInputOption: 'RAW',
      requestBody: {
        values: [['logId', 'proposalId', 'action', 'userType', 'details', 'timestamp']],
      },
    });
  }

  private async getRows(range: string): Promise<any[][]> {
    const response = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range,
    });
    return response.data.values || [];
  }

  private async append(range: string, values: any[][]): Promise<void> {
    await this.sheets.spreadsheets.values.append({
      spreadsheetId: this.spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values },
    });
  }

  private async update(range: string, values: any[][]): Promise<void> {
    await this.sheets.spreadsheets.values.update({
      spreadsheetId: this.spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values },
    });
  }

  async logActivity(proposalId: string, action: string, userType: 'Admin' | 'Client', details: string): Promise<void> {
    const now = new Date().toISOString();
    const logId = `LOG_${Date.now()}`;
    await this.append('Activity_Log!A:F', [[logId, proposalId, action, userType, details, now]]);
  }

  async createProposal(data: ProposalInput, appBaseUrl?: string): Promise<string> {
    await this.ensureSheets();
    const now = new Date().toISOString();
    const proposalLink = appBaseUrl ? `${appBaseUrl.replace(/\/$/, '')}/proposal/${data.proposalId}` : '';

    await this.append('Proposals!A:Q', [[
      data.proposalId,
      data.clientName,
      data.contactNumber,
      data.email || '',
      data.eventDate,
      data.guestCount,
      data.eventType,
      'Draft',
      now,
      1,
      proposalLink,
      '',
      '',
      '',
      'FALSE',
      'FALSE',
      'FALSE',
    ]]);

    await this.logActivity(data.proposalId, 'Proposal Created', 'Admin', `Created proposal for ${data.clientName}`);
    return data.proposalId;
  }

  async getProposal(proposalId: string): Promise<any | null> {
    await this.ensureSheets();
    const rows = await this.getRows('Proposals!A:Q');
    const proposals = rows.slice(1);
    const row = proposals.find((r) => r[0] === proposalId);
    if (!row) return null;

    return {
      proposalId: row[0],
      clientName: row[1],
      contactNumber: row[2],
      email: row[3],
      eventDate: row[4],
      guestCount: parseInt(row[5]) || 0,
      eventType: row[6],
      status: row[7],
      createdDate: row[8],
      currentVersion: parseInt(row[9]) || 1,
      proposalLink: row[10] || '',
      finalAmount: parseFloat(row[11]) || 0,
      discountPercent: parseFloat(row[12]) || 0,
      advanceAmount: parseFloat(row[13]) || 0,
      isLocked: row[14] === 'TRUE',
      completed: row[15] === 'TRUE',
      cancelled: row[16] === 'TRUE',
    };
  }

  async getAllProposals(): Promise<any[]> {
    await this.ensureSheets();
    const rows = await this.getRows('Proposals!A:Q');
    return rows.slice(1).map((row) => ({
      proposalId: row[0],
      clientName: row[1],
      contactNumber: row[2],
      email: row[3],
      eventDate: row[4],
      guestCount: parseInt(row[5]) || 0,
      eventType: row[6],
      status: row[7],
      createdDate: row[8],
      currentVersion: parseInt(row[9]) || 1,
      proposalLink: row[10] || '',
      finalAmount: parseFloat(row[11]) || 0,
      isLocked: row[14] === 'TRUE',
      completed: row[15] === 'TRUE',
      cancelled: row[16] === 'TRUE',
    }));
  }

  async updateProposalDetails(proposalId: string, data: ProposalDetailsUpdateInput): Promise<boolean> {
    await this.ensureSheets();
    const rows = await this.getRows('Proposals!A:Q');
    const rowIndex = rows.findIndex((row) => row[0] === proposalId);
    if (rowIndex === -1) return false;

    const sheetRowNumber = rowIndex + 1;
    await this.update(`Proposals!B${sheetRowNumber}:G${sheetRowNumber}`, [[
      data.clientName,
      data.contactNumber,
      data.email || '',
      data.eventDate,
      data.guestCount,
      data.eventType,
    ]]);

    await this.logActivity(proposalId, 'Event Details Updated', 'Admin', 'Updated proposal event details');
    return true;
  }

  async getMenuItems(): Promise<any[]> {
    await this.ensureSheets();
    const rows = await this.getRows('Menu_Master!A:E');
    if (rows.length < 2) return [];
    return rows.slice(1)
      .filter((row) => row[4] === 'TRUE')
      .map((row) => ({
        itemId: row[0],
        category: row[1],
        itemName: row[2],
        description: row[3],
        isActive: row[4] === 'TRUE',
      }));
  }

  async saveProposalVersion(proposalId: string, menuItems: any[], totalPrice: number, createdBy: string): Promise<{ versionId: string; versionNumber: number }> {
    await this.ensureSheets();
    const now = new Date().toISOString();
    const versionId = `VER_${Date.now()}`;
    const proposal = await this.getProposal(proposalId);
    const nextVersion = (proposal?.currentVersion || 0) + 1;

    await this.append('Proposal_Versions!A:G', [[
      versionId,
      proposalId,
      nextVersion,
      JSON.stringify(menuItems),
      totalPrice,
      now,
      createdBy,
    ]]);

    const rows = await this.getRows('Proposals!A:Q');
    const rowIndex = rows.findIndex((row) => row[0] === proposalId);
    if (rowIndex > 0) {
      await this.update(`Proposals!J${rowIndex + 1}`, [[nextVersion]]);
    }

    await this.logActivity(proposalId, 'Menu Selection Saved', 'Client', `Saved version ${nextVersion}`);
    return { versionId, versionNumber: nextVersion };
  }

  async getLatestProposalVersion(proposalId: string): Promise<any | null> {
    await this.ensureSheets();
    const rows = await this.getRows('Proposal_Versions!A:G');
    const versions = rows.slice(1).filter((row) => row[1] === proposalId);
    if (versions.length === 0) return null;

    versions.sort((a, b) => (parseInt(b[2]) || 0) - (parseInt(a[2]) || 0));
    const latest = versions[0];

    return {
      versionId: latest[0],
      proposalId: latest[1],
      versionNumber: parseInt(latest[2]) || 0,
      menuItems: JSON.parse(latest[3] || '[]'),
      totalPrice: parseFloat(latest[4]) || 0,
      createdDate: latest[5],
      createdBy: latest[6],
    };
  }

  async updateProposalNegotiation(proposalId: string, data: {
    finalAmount: number;
    discountPercent: number;
    advanceAmount: number;
    isLocked: boolean;
    status?: string;
  }): Promise<boolean> {
    await this.ensureSheets();
    const rows = await this.getRows('Proposals!A:Q');
    const rowIndex = rows.findIndex((row) => row[0] === proposalId);
    if (rowIndex === -1) return false;

    const sheetRowNumber = rowIndex + 1;
    await this.update(`Proposals!L${sheetRowNumber}:O${sheetRowNumber}`, [[
      data.finalAmount,
      data.discountPercent,
      data.advanceAmount,
      data.isLocked ? 'TRUE' : 'FALSE',
    ]]);

    if (data.status) {
      await this.update(`Proposals!H${sheetRowNumber}`, [[data.status]]);
    }

    await this.logActivity(proposalId, 'Negotiation Updated', 'Admin', `Updated negotiation details. Locked: ${data.isLocked}`);
    return true;
  }

  async deleteProposal(proposalId: string, status: 'Completed' | 'Cancelled' = 'Completed'): Promise<boolean> {
    await this.ensureSheets();
    const rows = await this.getRows('Proposals!A:Q');
    const rowIndex = rows.findIndex((row) => row[0] === proposalId);
    if (rowIndex === -1) return false;

    const sheetRowNumber = rowIndex + 1;
    await this.update(`Proposals!H${sheetRowNumber}`, [[status]]);

    if (status === 'Completed') {
      await this.update(`Proposals!P${sheetRowNumber}`, [['TRUE']]);
    } else {
      await this.update(`Proposals!Q${sheetRowNumber}`, [['TRUE']]);
    }

    await this.logActivity(proposalId, `Proposal ${status}`, 'Admin', `Proposal marked as ${status.toLowerCase()}`);
    return true;
  }

  async getActivityLogs(): Promise<any[]> {
    await this.ensureSheets();
    const rows = await this.getRows('Activity_Log!A:F');
    const logs = rows.slice(1).map((row) => ({
      logId: row[0],
      proposalId: row[1],
      action: row[2],
      userType: row[3],
      details: row[4],
      timestamp: row[5],
    }));

    logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return logs;
  }
}
