import { GrantDetail, GrantSearchQuery, GrantSummary } from "../shared/types";

const V2_BASE_URL = "https://api.jgrants-portal.go.jp/v2";
const V1_BASE_URL = "https://api.jgrants-portal.go.jp/v1";

function authHeader(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

function buildSearchParams(query: GrantSearchQuery): URLSearchParams {
  const params = new URLSearchParams();
  if (query.keyword) params.set("keyword", query.keyword);
  if (query.region) params.set("region", query.region);
  if (query.openFrom) params.set("open_from", query.openFrom);
  if (query.openTo) params.set("open_to", query.openTo);
  return params;
}

function getStringField(item: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = item[key];
    if (typeof value === "string" && value.length > 0) {
      return value;
    }
  }
  return undefined;
}

function mapSummary(item: Record<string, unknown>): GrantSummary {
  return {
    id: String(item.id ?? item.subsidy_id ?? ""),
    title: getStringField(item, ["title", "name", "subsidy_title"]) ?? "",
    organization: getStringField(item, ["organization", "organization_name", "ministry"]) ?? "",
    deadline: getStringField(item, ["deadline", "application_deadline", "close_date"]),
    region: getStringField(item, ["region", "prefecture", "target_region"])
  };
}

function mapDetail(item: Record<string, unknown>): GrantDetail {
  return {
    ...mapSummary(item),
    description: getStringField(item, ["description", "overview", "summary"]),
    eligibility: getStringField(item, ["eligibility", "target", "conditions"]),
    subsidyRate: getStringField(item, ["subsidy_rate", "grant_rate", "rate"]),
    contact: getStringField(item, ["contact", "contact_info", "inquiry"])
  };
}

function parseItems(body: unknown): Record<string, unknown>[] {
  if (!body || typeof body !== "object") return [];
  const obj = body as Record<string, unknown>;
  const candidates = [obj.items, obj.results, obj.data, obj.subsidies];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate.filter((x): x is Record<string, unknown> => Boolean(x) && typeof x === "object");
    }
  }
  return [];
}

function parseItem(body: unknown): Record<string, unknown> | null {
  if (!body || typeof body !== "object") return null;
  const obj = body as Record<string, unknown>;
  const candidates = [obj.item, obj.result, obj.data, obj.subsidy];
  for (const candidate of candidates) {
    if (candidate && typeof candidate === "object" && !Array.isArray(candidate)) {
      return candidate as Record<string, unknown>;
    }
  }
  return null;
}

function shouldFallback(status: number): boolean {
  if (status === 401 || status === 403) return false;
  return status === 404 || status === 410 || status === 422 || status === 501;
}

async function requestJson(
  token: string,
  baseUrl: string,
  path: string,
  query?: URLSearchParams
): Promise<{ status: number; body: unknown }> {
  const url = `${baseUrl}${path}${query ? `?${query.toString()}` : ""}`;
  const response = await fetch(url, { headers: authHeader(token) });
  const body = await response.json().catch(() => null);
  return { status: response.status, body };
}

export async function searchGrants(token: string, query: GrantSearchQuery): Promise<GrantSummary[]> {
  const params = buildSearchParams(query);
  const v2 = await requestJson(token, V2_BASE_URL, "/subsidies", params);

  if (v2.status >= 200 && v2.status < 300) {
    return parseItems(v2.body).map(mapSummary);
  }

  if (!shouldFallback(v2.status)) {
    throw new Error(`Search failed on v2: ${v2.status}`);
  }

  const v1 = await requestJson(token, V1_BASE_URL, "/subsidies", params);
  if (v1.status >= 200 && v1.status < 300) {
    return parseItems(v1.body).map(mapSummary);
  }

  throw new Error(`Search failed on v2(${v2.status}) and v1(${v1.status})`);
}

export async function fetchGrantDetail(token: string, grantId: string): Promise<GrantDetail> {
  const v2 = await requestJson(token, V2_BASE_URL, `/subsidies/${grantId}`);
  if (v2.status >= 200 && v2.status < 300) {
    const item = parseItem(v2.body);
    if (!item) throw new Error("Missing detail payload on v2");
    return mapDetail(item);
  }

  if (!shouldFallback(v2.status)) {
    throw new Error(`Detail failed on v2: ${v2.status}`);
  }

  const v1 = await requestJson(token, V1_BASE_URL, `/subsidies/${grantId}`);
  if (v1.status >= 200 && v1.status < 300) {
    const item = parseItem(v1.body);
    if (!item) throw new Error("Missing detail payload on v1");
    return mapDetail(item);
  }

  throw new Error(`Detail failed on v2(${v2.status}) and v1(${v1.status})`);
}
