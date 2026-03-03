import { app } from "electron";
import { join } from "node:path";
import { createFavoritesStore } from "./favorites-store-core";

const store = createFavoritesStore(join(app.getPath("userData"), "favorites.json"));

export const ensureStore = store.ensureStore;
export const listFavorites = store.listFavorites;
export const saveFavorite = store.saveFavorite;
export const removeFavorite = store.removeFavorite;
