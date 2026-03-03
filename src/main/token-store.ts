import { app, safeStorage } from "electron";
import { join } from "node:path";
import { createTokenStore } from "./token-store-core";

const tokenStore = createTokenStore(join(app.getPath("userData"), "token.enc"), {
  isEncryptionAvailable: () => safeStorage.isEncryptionAvailable(),
  encryptString: (text: string) => safeStorage.encryptString(text),
  decryptString: (value: Buffer) => safeStorage.decryptString(value)
});

export const getToken = tokenStore.getToken;
export const setToken = tokenStore.setToken;
export const clearToken = tokenStore.clearToken;
