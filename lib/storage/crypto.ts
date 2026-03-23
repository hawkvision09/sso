import crypto from 'crypto';

const ENCRYPTION_KEY_RAW = process.env.STORAGE_ENCRYPTION_KEY || process.env.JWT_SECRET || '';

function getKey(): Buffer {
  if (!ENCRYPTION_KEY_RAW) {
    throw new Error('Missing STORAGE_ENCRYPTION_KEY (or JWT_SECRET fallback)');
  }

  if (/^[0-9a-fA-F]{64}$/.test(ENCRYPTION_KEY_RAW)) {
    return Buffer.from(ENCRYPTION_KEY_RAW, 'hex');
  }

  return crypto.createHash('sha256').update(ENCRYPTION_KEY_RAW).digest();
}

export function encryptText(plainText: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);

  return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decryptText(encryptedText: string): string {
  const [ivHex, payloadHex] = encryptedText.split(':');
  if (!ivHex || !payloadHex) {
    throw new Error('Invalid encrypted payload format');
  }

  const key = getKey();
  const iv = Buffer.from(ivHex, 'hex');
  const payload = Buffer.from(payloadHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);

  const decrypted = Buffer.concat([decipher.update(payload), decipher.final()]);
  return decrypted.toString('utf8');
}
