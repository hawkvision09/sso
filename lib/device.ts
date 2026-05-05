import { createHash } from 'crypto';

export interface DeviceContext {
  deviceId: string;
  deviceInfo: string;
  deviceType: string;
  osName: string;
  osVersion: string;
  browserName: string;
  browserVersion: string;
  userAgent: string;
  ipAddress: string;
  metadataHash: string;
}

function normalize(value: string | null | undefined, fallback: string): string {
  const trimmed = value?.trim();
  return trimmed || fallback;
}

function isPrivateOrLoopbackIp(ip: string): boolean {
  const normalized = ip.trim().toLowerCase();

  if (!normalized) return true;
  if (normalized === '::1' || normalized === 'localhost') return true;
  if (normalized === '127.0.0.1' || normalized === '0.0.0.0') return true;
  if (normalized.startsWith('127.')) return true;
  if (normalized.startsWith('10.')) return true;
  if (normalized.startsWith('192.168.')) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(normalized)) return true;
  if (normalized === '::ffff:127.0.0.1') return true;
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;
  if (normalized.startsWith('fe80:')) return true;

  return false;
}

function extractBestClientIp(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    const candidates = forwardedFor.split(',').map(ip => ip.trim()).filter(Boolean);
    for (const candidate of candidates) {
      if (!isPrivateOrLoopbackIp(candidate)) {
        return candidate;
      }
    }
    if (candidates.length > 0) {
      return candidates[0];
    }
  }

  const fallbackHeaders = [
    request.headers.get('x-real-ip'),
    request.headers.get('cf-connecting-ip'),
  ];

  for (const headerValue of fallbackHeaders) {
    const candidate = normalize(headerValue, '');
    if (candidate && !isPrivateOrLoopbackIp(candidate)) {
      return candidate;
    }
  }

  for (const headerValue of fallbackHeaders) {
    const candidate = normalize(headerValue, '');
    if (candidate) {
      return candidate;
    }
  }

  return 'Unknown';
}

function detectDeviceType(userAgent: string): string {
  const lower = userAgent.toLowerCase();
  if (lower.includes('ipad') || lower.includes('tablet')) return 'tablet';
  if (lower.includes('mobi') || lower.includes('iphone') || lower.includes('android')) return 'phone';
  return 'desktop';
}

function detectOs(userAgent: string): { osName: string; osVersion: string } {
  const windows = userAgent.match(/Windows NT ([0-9.]+)/i);
  if (windows) return { osName: 'Windows', osVersion: windows[1] };

  const android = userAgent.match(/Android ([0-9.]+)/i);
  if (android) return { osName: 'Android', osVersion: android[1] };

  const iphone = userAgent.match(/iPhone OS ([0-9_]+)/i);
  if (iphone) return { osName: 'iOS', osVersion: iphone[1].replaceAll('_', '.') };

  const mac = userAgent.match(/Mac OS X ([0-9_]+)/i);
  if (mac) return { osName: 'macOS', osVersion: mac[1].replaceAll('_', '.') };

  if (/Linux/i.test(userAgent)) return { osName: 'Linux', osVersion: '' };

  return { osName: 'unknown', osVersion: '' };
}

function detectBrowser(userAgent: string): { browserName: string; browserVersion: string } {
  const edge = userAgent.match(/Edg(?:e|A|iOS)?\/([0-9.]+)/i);
  if (edge) return { browserName: 'Edge', browserVersion: edge[1] };

  const chrome = userAgent.match(/Chrome\/([0-9.]+)/i);
  if (chrome && !/Edg(?:e|A|iOS)?\//i.test(userAgent)) return { browserName: 'Chrome', browserVersion: chrome[1] };

  const safari = userAgent.match(/Version\/([0-9.]+).*Safari/i);
  if (safari && !/Chrome\//i.test(userAgent)) return { browserName: 'Safari', browserVersion: safari[1] };

  const firefox = userAgent.match(/Firefox\/([0-9.]+)/i);
  if (firefox) return { browserName: 'Firefox', browserVersion: firefox[1] };

  return { browserName: 'unknown', browserVersion: '' };
}

export function createDeviceFingerprint(input: {
  userAgent: string;
  ipAddress: string;
}): string {
  return createHash('sha256').update(`${input.userAgent}|${input.ipAddress}`).digest('hex');
}

export function createDeviceMetadataHash(input: {
  deviceId: string;
  userAgent: string;
  ipAddress: string;
  deviceType: string;
  osName: string;
  osVersion: string;
  browserName: string;
  browserVersion: string;
}): string {
  return createHash('sha256')
    .update([
      input.deviceId,
      input.userAgent,
      input.ipAddress,
      input.deviceType,
      input.osName,
      input.osVersion,
      input.browserName,
      input.browserVersion,
    ].join('|'))
    .digest('hex');
}

export function resolveDeviceContext(request: Request, deviceIdOverride?: string): DeviceContext {
  const userAgent = normalize(request.headers.get('user-agent'), 'Unknown');
  const ipAddress = extractBestClientIp(request);

  const headerDeviceId = normalize(request.headers.get('x-device-id'), '');
  const deviceId = headerDeviceId || normalize(deviceIdOverride, '') || createDeviceFingerprint({ userAgent, ipAddress });
  const deviceType = detectDeviceType(userAgent);
  const { osName, osVersion } = detectOs(userAgent);
  const { browserName, browserVersion } = detectBrowser(userAgent);

  return {
    deviceId,
    deviceInfo: userAgent,
    deviceType,
    osName,
    osVersion,
    browserName,
    browserVersion,
    userAgent,
    ipAddress,
    metadataHash: createDeviceMetadataHash({
      deviceId,
      userAgent,
      ipAddress,
      deviceType,
      osName,
      osVersion,
      browserName,
      browserVersion,
    }),
  };
}