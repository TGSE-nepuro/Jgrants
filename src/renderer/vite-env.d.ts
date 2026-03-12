/// <reference types="vite/client" />

import {
  FavoriteGrant,
  GrantDetail,
  GrantSearchQuery,
  GrantSummary,
  LogEntry,
  RequestTraceContext
} from "../shared/types";

declare global {
  interface Window {
    jgrantsApi: {
      search: (
        token: string,
        query: GrantSearchQuery,
        trace?: RequestTraceContext
      ) => Promise<GrantSummary[]>;
      detail: (token: string, grantId: string, trace?: RequestTraceContext) => Promise<GrantDetail>;
      listRegions: (token: string, trace?: RequestTraceContext) => Promise<string[]>;
      listFavorites: () => Promise<FavoriteGrant[]>;
      saveFavorite: (favorite: FavoriteGrant) => Promise<{ ok: boolean }>;
      removeFavorite: (grantId: string) => Promise<{ ok: boolean }>;
      exportCsv: (grants: GrantSummary[]) => Promise<{ path: string | null }>;
      getToken: () => Promise<string>;
      setToken: (token: string) => Promise<{ ok: boolean }>;
      clearToken: () => Promise<{ ok: boolean }>;
      listLogs: () => Promise<LogEntry[]>;
      clearLogs: () => Promise<{ ok: boolean }>;
    };
  }
}

export {};
