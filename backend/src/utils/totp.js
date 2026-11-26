import { createCipheriv, createDecipheriv, createHmac, randomBytes } from 'node:crypto';

const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const encodeBase32 = (buffer) => {
  let bits = 0; let value = 0; let output = '';
  for (const byte of buffer) { value = (value << 8) | byte; bits += 8; while (bits >= 5) { output += alphabet[(value >>> (bits - 5)) & 31]; bits -= 5; } }
  if (bits > 0) output += alphabet[(value << (5 - bits)) & 31];
  return output;
};
const decodeBase32 = (text) => {
  let bits = 0; let value = 0; const bytes = [];
  for (const char of String(text).toUpperCase().replace(/=+$/g, '')) { const digit = alphabet.indexOf(char); if (digit < 0) throw new Error('Invalid base32 secret.'); value = (value << 5) | digit; bits += 5; if (bits >= 8) { bytes.push((value >>> (bits - 8)) & 255); bits -= 8; } }
  return Buffer.from(bytes);
};
const encryptionKey = () => {
  const secret = process.env.MFA_ENCRYPTION_KEY;
  if (!secret || secret.length < 32) {
    throw new Error('MFA_ENCRYPTION_KEY must be configured with at least 32 characters.');
  }
  return createHmac('sha256', secret).update('ahub-totp-encryption').digest();
};

export const createTotpSecret = () => encodeBase32(randomBytes(20));
export const encryptTotpSecret = (secret) => {
  const iv = randomBytes(12); const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv); const ciphertext = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  return `${iv.toString('base64url')}.${cipher.getAuthTag().toString('base64url')}.${ciphertext.toString('base64url')}`;
};
export const decryptTotpSecret = (stored) => {
  const [iv, tag, data] = String(stored).split('.'); const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(iv, 'base64url')); decipher.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(data, 'base64url')), decipher.final()]).toString('utf8');
};
export const totpStep = (timeMs = Date.now()) => Math.floor(timeMs / 30000);
export const createTotpCode = (secret, step = totpStep()) => {
  const counter = Buffer.alloc(8); counter.writeBigUInt64BE(BigInt(step));
  const digest = createHmac('sha1', decodeBase32(secret)).update(counter).digest(); const offset = digest[digest.length - 1] & 15;
  const binary = ((digest[offset] & 127) << 24) | ((digest[offset + 1] & 255) << 16) | ((digest[offset + 2] & 255) << 8) | (digest[offset + 3] & 255);
  return String(binary % 1000000).padStart(6, '0');
};
export const verifyTotpCode = (secret, code, timeMs = Date.now(), window = 1) => {
  if (!/^\d{6}$/.test(String(code))) return null;
  const current = totpStep(timeMs);
  for (let step = current - window; step <= current + window; step += 1) if (createTotpCode(secret, step) === String(code)) return step;
  return null;
};
export const totpUri = (secret, account, issuer = 'AHub') => `otpauth://totp/${encodeURIComponent(`${issuer}:${account}`)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
