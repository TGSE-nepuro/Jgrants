export type LogEntry = {
  timestamp: string;
  level: "info" | "warn" | "error";
  message: string;
  meta?: unknown;
};

const MAX_LOGS = 200;
const buffer: LogEntry[] = [];

export function addLog(entry: LogEntry): void {
  buffer.push(entry);
  if (buffer.length > MAX_LOGS) {
    buffer.splice(0, buffer.length - MAX_LOGS);
  }
}

export function listLogs(): LogEntry[] {
  return [...buffer];
}

export function clearLogs(): void {
  buffer.length = 0;
}
