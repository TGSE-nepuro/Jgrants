import { buildLogEntry } from "./logger-core";

export function logInfo(message: string, meta?: unknown): void {
  console.log(buildLogEntry("info", message, meta));
}

export function logWarn(message: string, meta?: unknown): void {
  console.warn(buildLogEntry("warn", message, meta));
}

export function logError(message: string, meta?: unknown): void {
  console.error(buildLogEntry("error", message, meta));
}
