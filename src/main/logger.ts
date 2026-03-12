import { buildLogPayload } from "./logger-core";
import { addLog } from "./log-store";

export function logInfo(message: string, meta?: unknown): void {
  const payload = buildLogPayload("info", message, meta);
  addLog(payload);
  console.log(JSON.stringify(payload));
}

export function logWarn(message: string, meta?: unknown): void {
  const payload = buildLogPayload("warn", message, meta);
  addLog(payload);
  console.warn(JSON.stringify(payload));
}

export function logError(message: string, meta?: unknown): void {
  const payload = buildLogPayload("error", message, meta);
  addLog(payload);
  console.error(JSON.stringify(payload));
}
