import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

const VERSION = 'v1';

function keyMaterial(secret: string): Buffer {
  return createHash('sha256').update(secret).digest();
}

export function encryptionSecret(env: Record<string, string | undefined> = process.env): string {
  const secret = env.PLAYCRICKET_KEY_SECRET?.trim() ?? '';
  if (secret.length < 16) throw new Error('Play-Cricket key storage is not configured.');
  return secret;
}

/** AES-256-GCM. The API key is not returned to the browser. */
export function encryptApiKey(plain: string, secret: string): { ciphertext: string; iv: string } {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', keyMaterial(secret), iv);
  const body = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    ciphertext: `${VERSION}.${Buffer.concat([body, tag]).toString('base64')}`,
    iv: iv.toString('base64'),
  };
}

export function decryptApiKey(ciphertext: string, iv: string, secret: string): string {
  const [, payload] = ciphertext.split('.');
  if (!payload) throw new Error('Stored Play-Cricket key could not be read.');
  const raw = Buffer.from(payload, 'base64');
  if (raw.length < 17) throw new Error('Stored Play-Cricket key could not be read.');
  const tag = raw.subarray(raw.length - 16);
  const body = raw.subarray(0, raw.length - 16);
  const decipher = createDecipheriv('aes-256-gcm', keyMaterial(secret), Buffer.from(iv, 'base64'));
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(body), decipher.final()]).toString('utf8');
}
