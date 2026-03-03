import { readFile, writeFile } from "node:fs/promises";
import { FavoriteGrant } from "../shared/types";

type StoreShape = { favorites?: FavoriteGrant[] };

export type FavoritesStore = {
  ensureStore: () => Promise<void>;
  listFavorites: () => Promise<FavoriteGrant[]>;
  saveFavorite: (favorite: FavoriteGrant) => Promise<void>;
  removeFavorite: (grantId: string) => Promise<void>;
};

function toFavorites(raw: string): FavoriteGrant[] {
  try {
    const parsed = JSON.parse(raw) as StoreShape;
    return parsed.favorites ?? [];
  } catch {
    return [];
  }
}

export function createFavoritesStore(storeFilePath: string): FavoritesStore {
  async function ensureStore(): Promise<void> {
    try {
      await readFile(storeFilePath, "utf-8");
    } catch {
      await writeFile(storeFilePath, JSON.stringify({ favorites: [] }, null, 2), "utf-8");
    }
  }

  async function listFavorites(): Promise<FavoriteGrant[]> {
    try {
      const raw = await readFile(storeFilePath, "utf-8");
      return toFavorites(raw);
    } catch {
      return [];
    }
  }

  async function saveFavorite(favorite: FavoriteGrant): Promise<void> {
    const current = await listFavorites();
    const next = [favorite, ...current.filter((item) => item.id !== favorite.id)];
    await writeFile(storeFilePath, JSON.stringify({ favorites: next }, null, 2), "utf-8");
  }

  async function removeFavorite(grantId: string): Promise<void> {
    const current = await listFavorites();
    const next = current.filter((item) => item.id !== grantId);
    await writeFile(storeFilePath, JSON.stringify({ favorites: next }, null, 2), "utf-8");
  }

  return { ensureStore, listFavorites, saveFavorite, removeFavorite };
}
