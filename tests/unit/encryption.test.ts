import { describe, it, expect } from "vitest";
import { encrypt, decrypt } from "@/lib/encryption";

// Generate a valid 32-byte key for tests.
const TEST_KEY = Buffer.alloc(32, 0xab).toString("base64");

function withKey(key: string | undefined, fn: () => void) {
  const original = process.env.CREDENTIALS_ENCRYPTION_KEY;
  if (key === undefined) {
    delete process.env.CREDENTIALS_ENCRYPTION_KEY;
  } else {
    process.env.CREDENTIALS_ENCRYPTION_KEY = key;
  }
  try {
    fn();
  } finally {
    if (original === undefined) {
      delete process.env.CREDENTIALS_ENCRYPTION_KEY;
    } else {
      process.env.CREDENTIALS_ENCRYPTION_KEY = original;
    }
  }
}

describe("encrypt / decrypt", () => {
  it("round-trips a plain object", () => {
    withKey(TEST_KEY, () => {
      const value = { username: "alice", sessionToken: "tok_123" };
      const token = encrypt(value);
      expect(token).toMatch(/^[A-Za-z0-9+/=]+\.[A-Za-z0-9+/=]+\.[A-Za-z0-9+/=]+$/);
      expect(decrypt(token)).toEqual(value);
    });
  });

  it("round-trips null and primitive values", () => {
    withKey(TEST_KEY, () => {
      expect(decrypt(encrypt(null))).toBeNull();
      expect(decrypt(encrypt(42))).toBe(42);
      expect(decrypt(encrypt("hello"))).toBe("hello");
    });
  });

  it("produces a different ciphertext on each call (random IV)", () => {
    withKey(TEST_KEY, () => {
      const t1 = encrypt({ a: 1 });
      const t2 = encrypt({ a: 1 });
      expect(t1).not.toBe(t2);
    });
  });

  it("rejects a tampered ciphertext (auth tag mismatch)", () => {
    withKey(TEST_KEY, () => {
      const token = encrypt({ secret: "data" });
      const [iv, ciphertext, tag] = token.split(".");
      // Flip a byte in the ciphertext by base64-decoding, mutating, re-encoding.
      const buf = Buffer.from(ciphertext, "base64");
      buf[0] ^= 0xff;
      const tampered = [iv, buf.toString("base64"), tag].join(".");
      expect(() => decrypt(tampered)).toThrow();
    });
  });

  it("rejects a tampered auth tag", () => {
    withKey(TEST_KEY, () => {
      const token = encrypt({ secret: "data" });
      const [iv, ciphertext, tag] = token.split(".");
      const tagBuf = Buffer.from(tag, "base64");
      tagBuf[0] ^= 0xff;
      const tampered = [iv, ciphertext, tagBuf.toString("base64")].join(".");
      expect(() => decrypt(tampered)).toThrow();
    });
  });

  it("rejects a token with wrong number of parts", () => {
    withKey(TEST_KEY, () => {
      expect(() => decrypt("onlyone")).toThrow("Invalid encrypted credential format.");
      expect(() => decrypt("two.parts")).toThrow("Invalid encrypted credential format.");
    });
  });
});

describe("fail-closed: CREDENTIALS_ENCRYPTION_KEY unset", () => {
  it("encrypt throws when the key is absent", () => {
    withKey(undefined, () => {
      expect(() => encrypt({ a: 1 })).toThrow("CREDENTIALS_ENCRYPTION_KEY is not set");
    });
  });

  it("decrypt throws when the key is absent", () => {
    // Produce a token with the key set, then try to decrypt without it.
    let token: string;
    withKey(TEST_KEY, () => {
      token = encrypt({ a: 1 });
    });
    withKey(undefined, () => {
      expect(() => decrypt(token!)).toThrow("CREDENTIALS_ENCRYPTION_KEY is not set");
    });
  });
});

describe("fail-closed: malformed CREDENTIALS_ENCRYPTION_KEY", () => {
  it("throws when the key is too short", () => {
    const shortKey = Buffer.alloc(16).toString("base64"); // 16 bytes, not 32
    withKey(shortKey, () => {
      expect(() => encrypt({ a: 1 })).toThrow("32-byte");
    });
  });
});
