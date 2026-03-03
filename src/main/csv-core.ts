import { GrantSummary } from "../shared/types";

function escapeCsv(value: string): string {
  const escaped = value.replace(/"/g, '""');
  return `"${escaped}"`;
}

export function grantsToCsv(grants: GrantSummary[]): string {
  const header = ["id", "title", "organization", "deadline", "region"];
  const rows = grants.map((grant) => [
    grant.id,
    grant.title,
    grant.organization,
    grant.deadline ?? "",
    grant.region ?? ""
  ]);

  return [header, ...rows]
    .map((row) => row.map((col) => escapeCsv(col)).join(","))
    .join("\n");
}
