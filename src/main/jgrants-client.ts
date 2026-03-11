import { z } from "zod";
import { GrantDetail, GrantSearchQuery, GrantSummary, RequestTraceContext } from "../shared/types";
import { logError, logInfo, logWarn } from "./logger";

const EXP_BASE_URL = "https://api.jgrants-portal.go.jp/exp";
const V2_BASE_URL = `${EXP_BASE_URL}/v2/public`;
const V1_BASE_URL = `${EXP_BASE_URL}/v1/public`;

const idSchema = z.union([z.string(), z.number()]).transform((value) => String(value));

const grantSummaryV2Schema = z.object({
  id: idSchema,
  title: z.string(),
  organization: z.string(),
  deadline: z.string().optional(),
  region: z.string().optional()
});

const grantSummaryV1BaseSchema = z.object({
  subsidy_id: idSchema,
  name: z.string(),
  organization_name: z.string().optional(),
  ministry: z.string().optional(),
  close_date: z.string().optional(),
  prefecture: z.string().optional(),
  target_region: z.string().optional()
});

const grantSummaryV1Schema = grantSummaryV1BaseSchema.refine(
  (value) => Boolean(value.organization_name || value.ministry),
  {
    message: "organization_name or ministry is required"
  }
);

const grantDetailV2Schema = grantSummaryV2Schema.extend({
  description: z.string().optional(),
  eligibility: z.string().optional(),
  subsidy_rate: z.string().optional(),
  contact: z.string().optional()
});

const grantDetailV1Schema = grantSummaryV1BaseSchema
  .extend({
    summary: z.string().optional(),
    conditions: z.string().optional(),
    rate: z.string().optional(),
    inquiry: z.string().optional()
  })
  .refine((value) => Boolean(value.organization_name || value.ministry), {
    message: "organization_name or ministry is required"
  });

const searchResponseV2Schema = z.object({ items: z.array(grantSummaryV2Schema) });
const searchResponseV1Schema = z.union([
  z.object({ items: z.array(grantSummaryV1Schema) }),
  z.object({ data: z.array(grantSummaryV1Schema) })
]);

const detailResponseV2Schema = z.union([
  z.object({ item: grantDetailV2Schema }),
  z.object({ data: grantDetailV2Schema })
]);

const detailResponseV1Schema = z.union([
  z.object({ item: grantDetailV1Schema }),
  z.object({ data: grantDetailV1Schema })
]);

function authHeader(token: string): HeadersInit {
  const trimmed = token.trim();
  if (!trimmed) {
    return { "Content-Type": "application/json" };
  }
  return { Authorization: `Bearer ${trimmed}`, "Content-Type": "application/json" };
}

function buildSearchParams(query: GrantSearchQuery): URLSearchParams {
  const params = new URLSearchParams();
  if (query.keyword) params.set("keyword", query.keyword);
  if (query.sort) params.set("sort", query.sort);
  if (query.order) params.set("order", query.order);
  if (query.acceptance) params.set("acceptance", query.acceptance);
  if (query.region) params.set("target_area_search", query.region);
  if (query.openFrom) params.set("acceptance_start_datetime", query.openFrom);
  if (query.openTo) params.set("acceptance_end_datetime", query.openTo);
  return params;
}

function parseRegionTokens(raw: string): string[] {
  return raw
    .split(/[\/／,，、]/g)
    .map((value) => value.trim())
    .filter(Boolean);
}

function mapSummaryFromV2(item: z.infer<typeof grantSummaryV2Schema>): GrantSummary {
  return {
    id: item.id,
    title: item.title,
    organization: item.organization,
    deadline: item.deadline,
    region: item.region
  };
}

function mapSummaryFromV1(item: z.infer<typeof grantSummaryV1Schema>): GrantSummary {
  return {
    id: item.subsidy_id,
    title: item.name,
    organization: item.organization_name ?? item.ministry ?? "",
    deadline: item.close_date,
    region: item.prefecture ?? item.target_region
  };
}

function mapDetailFromV2(item: z.infer<typeof grantDetailV2Schema>): GrantDetail {
  return {
    id: item.id,
    title: item.title,
    organization: item.organization,
    deadline: item.deadline,
    region: item.region,
    description: item.description,
    eligibility: item.eligibility,
    subsidyRate: item.subsidy_rate,
    contact: item.contact
  };
}

function mapDetailFromV1(item: z.infer<typeof grantDetailV1Schema>): GrantDetail {
  return {
    id: item.subsidy_id,
    title: item.name,
    organization: item.organization_name ?? item.ministry ?? "",
    deadline: item.close_date,
    region: item.prefecture ?? item.target_region,
    description: item.summary,
    eligibility: item.conditions,
    subsidyRate: item.rate,
    contact: item.inquiry
  };
}

function parseSearchV2(body: unknown): GrantSummary[] {
  const parsed = searchResponseV2Schema.safeParse(body);
  if (!parsed.success) {
    throw new Error(`Invalid v2 search payload: ${parsed.error.issues[0]?.message ?? "schema error"}`);
  }
  return parsed.data.items.map(mapSummaryFromV2);
}

function parseSearchV1(body: unknown): GrantSummary[] {
  const parsed = searchResponseV1Schema.safeParse(body);
  if (!parsed.success) {
    throw new Error(`Invalid v1 search payload: ${parsed.error.issues[0]?.message ?? "schema error"}`);
  }

  if ("items" in parsed.data) {
    return parsed.data.items.map(mapSummaryFromV1);
  }
  return parsed.data.data.map(mapSummaryFromV1);
}

function parseDetailV2(body: unknown): GrantDetail {
  const parsed = detailResponseV2Schema.safeParse(body);
  if (!parsed.success) {
    throw new Error(`Invalid v2 detail payload: ${parsed.error.issues[0]?.message ?? "schema error"}`);
  }

  if ("item" in parsed.data) {
    return mapDetailFromV2(parsed.data.item);
  }
  return mapDetailFromV2(parsed.data.data);
}

function parseDetailV1(body: unknown): GrantDetail {
  const parsed = detailResponseV1Schema.safeParse(body);
  if (!parsed.success) {
    throw new Error(`Invalid v1 detail payload: ${parsed.error.issues[0]?.message ?? "schema error"}`);
  }

  if ("item" in parsed.data) {
    return mapDetailFromV1(parsed.data.item);
  }
  return mapDetailFromV1(parsed.data.data);
}

function shouldFallback(status: number): boolean {
  if (status === 401 || status === 403) return false;
  return status === 404 || status === 410 || status === 422 || status === 501;
}

function createRequestId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `req-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

async function requestJson(
  token: string,
  baseUrl: string,
  path: string,
  context: { requestId: string; operation: "search" | "detail"; apiVersion: "v1" | "v2" },
  query?: URLSearchParams
): Promise<{ status: number; body: unknown; durationMs: number }> {
  const url = `${baseUrl}${path}${query ? `?${query.toString()}` : ""}`;
  const startedAt = Date.now();

  try {
    const response = await fetch(url, { headers: authHeader(token) });
    const body = await response.json().catch(() => null);
    return { status: response.status, body, durationMs: Date.now() - startedAt };
  } catch (error) {
    logError("jgrants request failed", {
      requestId: context.requestId,
      operation: context.operation,
      endpoint: path,
      apiVersion: context.apiVersion,
      durationMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

export async function searchGrants(
  token: string,
  query: GrantSearchQuery,
  trace?: RequestTraceContext
): Promise<GrantSummary[]> {
  const requestId = trace?.requestId ?? createRequestId();
  const startedAt = Date.now();
  const params = buildSearchParams(query);
  const v1 = await requestJson(
    token,
    V1_BASE_URL,
    "/subsidies",
    { requestId, operation: "search", apiVersion: "v1" },
    params
  );
  if (v1.status >= 200 && v1.status < 300) {
    const grants = parseSearchV1(v1.body);
    logInfo("jgrants search completed", {
      requestId,
      apiVersion: "v1",
      status: v1.status,
      resultCount: grants.length,
      durationMs: Date.now() - startedAt
    });
    return grants;
  }

  logWarn("jgrants search failed without fallback", {
    requestId,
    endpoint: "/subsidies",
    apiVersion: "v1",
    status: v1.status,
    durationMs: v1.durationMs
  });
  throw new Error(`Search failed on v1: ${v1.status}`);
}

export async function fetchGrantDetail(
  token: string,
  grantId: string,
  trace?: RequestTraceContext
): Promise<GrantDetail> {
  const requestId = trace?.requestId ?? createRequestId();
  const startedAt = Date.now();
  const endpoint = `/subsidies/id/${grantId}`;
  const v2 = await requestJson(
    token,
    V2_BASE_URL,
    endpoint,
    { requestId, operation: "detail", apiVersion: "v2" }
  );
  if (v2.status >= 200 && v2.status < 300) {
    const detail = parseDetailV2(v2.body);
    logInfo("jgrants detail completed", {
      requestId,
      grantId,
      apiVersion: "v2",
      status: v2.status,
      durationMs: Date.now() - startedAt
    });
    return detail;
  }

  if (!shouldFallback(v2.status)) {
    logWarn("jgrants detail failed without fallback", {
      requestId,
      endpoint,
      apiVersion: "v2",
      status: v2.status,
      durationMs: v2.durationMs
    });
    throw new Error(`Detail failed on v2: ${v2.status}`);
  }

  logWarn("Fallback to v1 for detail", {
    requestId,
    endpoint,
    fromVersion: "v2",
    toVersion: "v1",
    status: v2.status,
    durationMs: v2.durationMs
  });
  const v1 = await requestJson(token, V1_BASE_URL, endpoint, {
    requestId,
    operation: "detail",
    apiVersion: "v1"
  });
  if (v1.status >= 200 && v1.status < 300) {
    const detail = parseDetailV1(v1.body);
    logInfo("jgrants detail completed", {
      requestId,
      grantId,
      apiVersion: "v1",
      status: v1.status,
      durationMs: Date.now() - startedAt
    });
    return detail;
  }

  logWarn("jgrants detail failed after fallback", {
    requestId,
    grantId,
    v2Status: v2.status,
    v1Status: v1.status,
    totalDurationMs: Date.now() - startedAt
  });
  throw new Error(`Detail failed on v2(${v2.status}) and v1(${v1.status})`);
}

export async function listRegions(token: string, trace?: RequestTraceContext): Promise<string[]> {
  const grants = await searchGrants(token, {}, trace);
  const regions = new Set<string>();

  for (const grant of grants) {
    if (!grant.region) continue;
    for (const tokenRegion of parseRegionTokens(grant.region)) {
      regions.add(tokenRegion);
    }
  }

  return [...regions].sort((a, b) => a.localeCompare(b, "ja"));
}
