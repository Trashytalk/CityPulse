// apps/api/src/lib/encryption.ts
import { createCipheriv, createDecipheriv, randomBytes, scrypt, createHash } from 'crypto';
import { promisify } from 'util';
import { env } from './env';

const scryptAsync = promisify(scrypt);
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 32;
const KEY_LENGTH = 32;

/**
 * Derive encryption key from secret
 */
async function deriveKey(salt: Buffer): Promise<Buffer> {
  return scryptAsync(env.JWT_SECRET, salt, KEY_LENGTH) as Promise<Buffer>;
}

/**
 * Encrypt a string
 */
export async function encrypt(plaintext: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const iv = randomBytes(IV_LENGTH);
  const key = await deriveKey(salt);
  
  const cipher = createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const tag = cipher.getAuthTag();
  
  // Format: salt:iv:tag:encrypted (all hex)
  return `${salt.toString('hex')}:${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt a string
 */
export async function decrypt(ciphertext: string): Promise<string> {
  const parts = ciphertext.split(':');
  
  if (parts.length !== 4) {
    throw new Error('Invalid encrypted data format');
  }
  
  const [saltHex, ivHex, tagHex, encrypted] = parts;
  
  const salt = Buffer.from(saltHex, 'hex');
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const key = await deriveKey(salt);
  
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Hash a string (one-way, for comparison)
 */
export function hash(data: string): string {
  return createHash('sha256').update(data).digest('hex');
}

/**
 * Generate a secure random string
 */
export function generateSecureToken(length = 32): string {
  return randomBytes(length).toString('hex');
}
