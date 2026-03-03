import { z } from "zod";
import { GrantDetail, GrantSearchQuery, GrantSummary } from "../shared/types";

const V2_BASE_URL = "https://api.jgrants-portal.go.jp/v2";
const V1_BASE_URL = "https://api.jgrants-portal.go.jp/v1";

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
    return parseSearchV2(v2.body);
  }

  if (!shouldFallback(v2.status)) {
    throw new Error(`Search failed on v2: ${v2.status}`);
  }

  const v1 = await requestJson(token, V1_BASE_URL, "/subsidies", params);
  if (v1.status >= 200 && v1.status < 300) {
    return parseSearchV1(v1.body);
  }

  throw new Error(`Search failed on v2(${v2.status}) and v1(${v1.status})`);
}

export async function fetchGrantDetail(token: string, grantId: string): Promise<GrantDetail> {
  const v2 = await requestJson(token, V2_BASE_URL, `/subsidies/${grantId}`);
  if (v2.status >= 200 && v2.status < 300) {
    return parseDetailV2(v2.body);
  }

  if (!shouldFallback(v2.status)) {
    throw new Error(`Detail failed on v2: ${v2.status}`);
  }

  const v1 = await requestJson(token, V1_BASE_URL, `/subsidies/${grantId}`);
  if (v1.status >= 200 && v1.status < 300) {
    return parseDetailV1(v1.body);
  }

  throw new Error(`Detail failed on v2(${v2.status}) and v1(${v1.status})`);
}
