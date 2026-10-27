import crypto from 'crypto';

// Resolve 32-byte key for AES-256-GCM
function getEncryptionKey(): Buffer {
  const secret = process.env.FIELD_ENCRYPTION_KEY || process.env.NEON_REALTIME_SECRET || 'rpsms-default-field-encryption-key-2026';
  return crypto.createHash('sha256').update(secret).digest();
}

/**
 * AES-256-GCM Field-Level Encryption
 * Format: iv:authTag:ciphertext (hex encoded)
 */
export function encryptField(plainText: string): string {
  if (!plainText) return '';
  const iv = crypto.randomBytes(12); // 96-bit IV recommended for GCM
  const key = getEncryptionKey();
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  
  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * AES-256-GCM Field-Level Decryption
 */
export function decryptField(encryptedPayload: string): string {
  if (!encryptedPayload) return '';
  const parts = encryptedPayload.split(':');
  if (parts.length !== 3) {
    // If not in encrypted format (e.g. legacy plain text), return as is or error
    return encryptedPayload;
  }
  
  const [ivHex, authTagHex, encryptedHex] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const key = getEncryptionKey();
  
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/**
 * Mask PII for UI presentation (e.g. 2xxxxx45)
 */
export function maskPii(val: string): string {
  if (!val || val.length <= 3) return '***';
  if (val.length <= 6) {
    return val[0] + 'x'.repeat(val.length - 2) + val[val.length - 1];
  }
  return val.slice(0, 2) + 'x'.repeat(val.length - 4) + val.slice(-2);
}

/**
 * Deterministic SHA-256 hash for indexed searches without leaking plaintext
 */
export function hashField(val: string): string {
  if (!val) return '';
  return crypto.createHash('sha256').update(val.trim().toLowerCase()).digest('hex');
}
