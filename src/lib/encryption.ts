import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGO = "aes-256-gcm";
const IV_BYTES = 12;
const TAG_BYTES = 16;

function getKey(): Buffer {
  const raw = process.env.CREDENTIALS_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "CREDENTIALS_ENCRYPTION_KEY is not set. Cannot encrypt or decrypt account credentials.",
    );
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error(
      "CREDENTIALS_ENCRYPTION_KEY must be a 32-byte (256-bit) key encoded as base64.",
    );
  }
  return key;
}

/**
 * Encrypts an arbitrary JSON-serialisable value using AES-256-GCM.
 * Returns a dot-joined base64 string: `iv.ciphertext.authTag`.
 * Throws if CREDENTIALS_ENCRYPTION_KEY is unset or malformed.
 */
export function encrypt(value: unknown): string {
  const key = getKey();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGO, key, iv);
  const plain = Buffer.from(JSON.stringify(value), "utf8");
  const ciphertext = Buffer.concat([cipher.update(plain), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64"), ciphertext.toString("base64"), tag.toString("base64")].join(".");
}

/**
 * Decrypts a value produced by `encrypt`.
 * Throws on a tampered ciphertext (auth tag mismatch) or if the key is unset.
 */
export function decrypt(token: string): unknown {
  const key = getKey();
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted credential format.");
  }
  const [ivB64, cipherB64, tagB64] = parts;
  const iv = Buffer.from(ivB64, "base64");
  const ciphertext = Buffer.from(cipherB64, "base64");
  const tag = Buffer.from(tagB64, "base64");

  if (iv.length !== IV_BYTES || tag.length !== TAG_BYTES) {
    throw new Error("Invalid encrypted credential format.");
  }

  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return JSON.parse(plain.toString("utf8"));
}
