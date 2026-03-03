import { readFile, writeFile, rm } from "node:fs/promises";

export type CryptoProvider = {
  isEncryptionAvailable: () => boolean;
  encryptString: (text: string) => Buffer;
  decryptString: (value: Buffer) => string;
};

export type TokenStore = {
  getToken: () => Promise<string>;
  setToken: (token: string) => Promise<void>;
  clearToken: () => Promise<void>;
};

export function createTokenStore(filePath: string, crypto: CryptoProvider): TokenStore {
  async function getToken(): Promise<string> {
    try {
      const encoded = await readFile(filePath, "utf-8");
      if (!encoded) return "";
      if (!crypto.isEncryptionAvailable()) return "";
      const decrypted = crypto.decryptString(Buffer.from(encoded, "base64"));
      return decrypted;
    } catch {
      return "";
    }
  }

  async function setToken(token: string): Promise<void> {
    if (!crypto.isEncryptionAvailable()) {
      throw new Error("OS encryption is not available");
    }
    const encrypted = crypto.encryptString(token).toString("base64");
    await writeFile(filePath, encrypted, "utf-8");
  }

  async function clearToken(): Promise<void> {
    await rm(filePath, { force: true });
  }

  return { getToken, setToken, clearToken };
}
