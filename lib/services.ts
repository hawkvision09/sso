import { v4 as uuidv4 } from 'uuid';
import { APP_CONFIG } from '@/lib/config';
import { 
  SHEET_NAMES, 
  appendRow, 
  findRowByColumn,
  deleteRowsByColumn,
  findRowIndexByColumn,
  updateRow
} from '@/lib/sheets';

export interface Service {
  service_id: string;
  name: string;
  description: string;
  redirect_url: string;
  free_tier_enabled: string; // 'true' or 'false' in sheets
  image_url?: string;
}

export interface AuthCode {
  code: string;
  user_id: string;
  service_id: string;
  expires_at: string;
  used: string; // 'true' or 'false' in sheets
}

export interface Entitlement {
  entitlement_id: string;
  user_id: string;
  service_id: string;
  tier_level: 'free' | 'pro';
  valid_until: string;
}

// Get service by ID
export async function getService(serviceId: string): Promise<Service | null> {
  const service = await findRowByColumn(SHEET_NAMES.SERVICES, 'service_id', serviceId);
  return service ? (service as Service) : null;
}

// Check if user has entitlement for service
export async function getUserEntitlement(
  userId: string, 
  serviceId: string
): Promise<Entitlement | null> {
  const sheets = await import('./sheets');
  const entitlements = await sheets.getRows(SHEET_NAMES.ENTITLEMENTS);
  
  const entitlement = entitlements.find(
    e => e.user_id === userId && e.service_id === serviceId
  );
  
  if (!entitlement) return null;
  
  // Check if valid
  if (entitlement.valid_until && new Date(entitlement.valid_until) < new Date()) {
    return null;
  }
  
  return entitlement as Entitlement;
}

// Create entitlement
export async function createEntitlement(
  userId: string,
  serviceId: string,
  tierLevel: 'free' | 'pro',
  validUntil?: string
): Promise<Entitlement> {
  const entitlement: Entitlement = {
    entitlement_id: uuidv4(),
    user_id: userId,
    service_id: serviceId,
    tier_level: tierLevel,
    valid_until: validUntil || '', // Empty for unlimited
  };
  
  await appendRow(SHEET_NAMES.ENTITLEMENTS, [
    entitlement.entitlement_id,
    entitlement.user_id,
    entitlement.service_id,
    entitlement.tier_level,
    entitlement.valid_until,
  ]);
  
  return entitlement;
}

// Generate authorization code
export async function generateAuthCode(
  userId: string,
  serviceId: string
): Promise<string> {
  const code = uuidv4();
  const expiresAt = new Date(
    Date.now() + APP_CONFIG.authCodeExpirySeconds * 1000
  ).toISOString();
  
  await appendRow(SHEET_NAMES.AUTH_CODES, [
    code,
    userId,
    serviceId,
    expiresAt,
    'false', // not used yet
  ]);
  
  return code;
}

// Verify and consume authorization code
export async function verifyAuthCode(code: string): Promise<{
  user_id: string;
  service_id: string;
} | null> {
  const authCode = await findRowByColumn(SHEET_NAMES.AUTH_CODES, 'code', code);
  
  if (!authCode) {
    return null;
  }
  
  // Check if already used
  if (authCode.used === 'true') {
    return null;
  }
  
  // Check if expired
  if (new Date(authCode.expires_at) < new Date()) {
    // Delete expired code
    await deleteRowsByColumn(SHEET_NAMES.AUTH_CODES, 'code', code);
    return null;
  }
  
  // Mark as used
  const rowIndex = await findRowIndexByColumn(SHEET_NAMES.AUTH_CODES, 'code', code);
  if (rowIndex !== -1) {
    await updateRow(SHEET_NAMES.AUTH_CODES, `A${rowIndex + 1}`, [
      authCode.code,
      authCode.user_id,
      authCode.service_id,
      authCode.expires_at,
      'true', // mark as used
    ]);
  }
  
  return {
    user_id: authCode.user_id,
    service_id: authCode.service_id,
  };
}

// Get all services
export async function getAllServices(): Promise<Service[]> {
  const sheets = await import('./sheets');
  const services = await sheets.getRows(SHEET_NAMES.SERVICES);
  return services as Service[];
}

// Create service (admin only)
export async function createService(
  name: string,
  description: string,
  redirectUrl: string,
  freeTierEnabled: boolean,
  imageUrl?: string
): Promise<Service> {
  const service: Service = {
    service_id: uuidv4(),
    name,
    description,
    redirect_url: redirectUrl,
    free_tier_enabled: freeTierEnabled ? 'true' : 'false',
    image_url: imageUrl || '',
  };
  
  await appendRow(SHEET_NAMES.SERVICES, [
    service.service_id,
    service.name,
    service.description,
    service.redirect_url,
    service.free_tier_enabled,
    service.image_url,
  ]);
  
  return service;
}

// Update service (admin only)
export async function updateService(
  serviceId: string,
  name: string,
  description: string,
  redirectUrl: string,
  freeTierEnabled: boolean,
  imageUrl?: string
): Promise<Service> {
  const rowIndex = await findRowIndexByColumn(SHEET_NAMES.SERVICES, 'service_id', serviceId);
  
  if (rowIndex === -1) {
    throw new Error('Service not found');
  }
  
  const service: Service = {
    service_id: serviceId,
    name,
    description,
    redirect_url: redirectUrl,
    free_tier_enabled: freeTierEnabled ? 'true' : 'false',
    image_url: imageUrl || '',
  };
  
  await updateRow(SHEET_NAMES.SERVICES, `A${rowIndex + 1}`, [
    service.service_id,
    service.name,
    service.description,
    service.redirect_url,
    service.free_tier_enabled,
    service.image_url,
  ]);
  
  return service;
}
