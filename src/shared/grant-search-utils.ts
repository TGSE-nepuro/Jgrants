import { GrantSummary } from "./types";

function uniq(values: string[]): string[] {
  return [...new Set(values)];
}

export function buildRegionQueries(selectedRegions: string[], includeNationwide: boolean): string[] {
  const normalized = uniq(selectedRegions.map((value) => value.trim()).filter(Boolean));

  if (includeNationwide && !normalized.includes("全国")) {
    return [...normalized, "全国"];
  }
  return normalized;
}

export function mergeGrantResults(groups: GrantSummary[][]): GrantSummary[] {
  const merged = new Map<string, GrantSummary>();
  for (const grants of groups) {
    for (const grant of grants) {
      if (!merged.has(grant.id)) {
        merged.set(grant.id, grant);
      }
    }
  }
  return [...merged.values()];
}
