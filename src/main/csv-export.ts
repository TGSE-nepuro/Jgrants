import { dialog } from "electron";
import { writeFile } from "node:fs/promises";
import { GrantSummary } from "../shared/types";
import { grantsToCsv } from "./csv-core";

export async function exportGrantsCsv(grants: GrantSummary[]): Promise<{ path: string | null }> {
  const result = await dialog.showSaveDialog({
    title: "比較CSVを保存",
    defaultPath: "jgrants-comparison.csv",
    filters: [{ name: "CSV", extensions: ["csv"] }]
  });

  if (result.canceled || !result.filePath) {
    return { path: null };
  }

  const content = grantsToCsv(grants);
  await writeFile(result.filePath, content, "utf-8");
  return { path: result.filePath };
}
