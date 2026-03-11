import { z } from "zod";
import {
  FavoriteGrant,
  GrantDetail,
  GrantSearchQuery,
  GrantSummary,
  LogEntry,
  RequestTraceContext
} from "../shared/types";

export type IpcRegistrar = {
  handle: (channel: string, listener: (...args: any[]) => unknown) => void;
};

export type IpcDependencies = {
  searchGrants: (
    token: string,
    query: GrantSearchQuery,
    trace?: RequestTraceContext
  ) => Promise<GrantSummary[]>;
  fetchGrantDetail: (
    token: string,
    grantId: string,
    trace?: RequestTraceContext
  ) => Promise<GrantDetail>;
  listRegions: (token: string, trace?: RequestTraceContext) => Promise<string[]>;
  listFavorites: () => Promise<FavoriteGrant[]>;
  saveFavorite: (favorite: FavoriteGrant) => Promise<void>;
  removeFavorite: (grantId: string) => Promise<void>;
  exportCsv: (grants: GrantSummary[]) => Promise<{ path: string | null }>;
  getToken: () => Promise<string>;
  setToken: (token: string) => Promise<void>;
  clearToken: () => Promise<void>;
  listLogs: () => Promise<LogEntry[]>;
  clearLogs: () => Promise<void>;
};

const searchQuerySchema = z.object({
  keyword: z.string().optional(),
  region: z.string().optional(),
  openFrom: z.string().optional(),
  openTo: z.string().optional()
});

const favoriteSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  organization: z.string(),
  savedAt: z.string()
});

const grantSummarySchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  organization: z.string(),
  deadline: z.string().optional(),
  region: z.string().optional()
});

const requestTraceSchema = z.object({
  requestId: z.string().min(1).optional()
});

export function registerIpcHandlers(registrar: IpcRegistrar, deps: IpcDependencies): void {
  registrar.handle(
    "grants:search",
    (_event: unknown, tokenRaw: unknown, queryRaw: unknown, traceRaw: unknown) => {
      const token = z.string().parse(tokenRaw);
      const query = searchQuerySchema.parse(queryRaw);
      const trace = traceRaw == null ? undefined : requestTraceSchema.parse(traceRaw);
      return deps.searchGrants(token, query, trace);
    }
  );

  registrar.handle(
    "grants:detail",
    (_event: unknown, tokenRaw: unknown, grantIdRaw: unknown, traceRaw: unknown) => {
      const token = z.string().parse(tokenRaw);
      const grantId = z.string().min(1).parse(grantIdRaw);
      const trace = traceRaw == null ? undefined : requestTraceSchema.parse(traceRaw);
      return deps.fetchGrantDetail(token, grantId, trace);
    }
  );

  registrar.handle("regions:list", (_event: unknown, tokenRaw: unknown, traceRaw: unknown) => {
    const token = z.string().parse(tokenRaw);
    const trace = traceRaw == null ? undefined : requestTraceSchema.parse(traceRaw);
    return deps.listRegions(token, trace);
  });

  registrar.handle("favorites:list", () => deps.listFavorites());

  registrar.handle("favorites:save", async (_event: unknown, favoriteRaw: unknown) => {
    const favorite = favoriteSchema.parse(favoriteRaw);
    await deps.saveFavorite(favorite);
    return { ok: true };
  });

  registrar.handle("favorites:remove", async (_event: unknown, grantIdRaw: unknown) => {
    const grantId = z.string().min(1).parse(grantIdRaw);
    await deps.removeFavorite(grantId);
    return { ok: true };
  });

  registrar.handle("grants:exportCsv", async (_event: unknown, grantsRaw: unknown) => {
    const grants = z.array(grantSummarySchema).min(1).parse(grantsRaw);
    return deps.exportCsv(grants);
  });

  registrar.handle("token:get", () => deps.getToken());

  registrar.handle("token:set", async (_event: unknown, tokenRaw: unknown) => {
    const token = z.string().min(1).parse(tokenRaw);
    await deps.setToken(token);
    return { ok: true };
  });

  registrar.handle("token:clear", async () => {
    await deps.clearToken();
    return { ok: true };
  });

  registrar.handle("logs:list", () => deps.listLogs());

  registrar.handle("logs:clear", async () => {
    await deps.clearLogs();
    return { ok: true };
  });
}
