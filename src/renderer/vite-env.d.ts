/// <reference types="vite/client" />

import { FavoriteGrant, GrantDetail, GrantSearchQuery, GrantSummary } from "../shared/types";

declare global {
  interface Window {
    jgrantsApi: {
      search: (token: string, query: GrantSearchQuery) => Promise<GrantSummary[]>;
      detail: (token: string, grantId: string) => Promise<GrantDetail>;
      listFavorites: () => Promise<FavoriteGrant[]>;
      saveFavorite: (favorite: FavoriteGrant) => Promise<{ ok: boolean }>;
      removeFavorite: (grantId: string) => Promise<{ ok: boolean }>;
      exportCsv: (grants: GrantSummary[]) => Promise<{ path: string | null }>;
      getToken: () => Promise<string>;
      setToken: (token: string) => Promise<{ ok: boolean }>;
      clearToken: () => Promise<{ ok: boolean }>;
    };
  }
}

export {};
