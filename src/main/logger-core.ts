export type LogLevel = "info" | "warn" | "error";

const SENSITIVE_KEYS = ["token", "authorization", "password", "secret", "apikey", "apiKey"];

function isSensitiveKey(key: string): boolean {
  const normalized = key.toLowerCase();
  return SENSITIVE_KEYS.some((needle) => normalized.includes(needle.toLowerCase()));
}

function maskString(value: string): string {
  return value
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer [REDACTED]")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[REDACTED_EMAIL]");
}

function maskUnknown(value: unknown, depth = 0): unknown {
  if (depth > 5) return "[TRUNCATED]";
  if (typeof value === "string") return maskString(value);
  if (Array.isArray(value)) return value.map((item) => maskUnknown(item, depth + 1));

  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      out[key] = isSensitiveKey(key) ? "[REDACTED]" : maskUnknown(item, depth + 1);
    }
    return out;
  }

  return value;
}

export function maskForLog(value: unknown): unknown {
  return maskUnknown(value);
}

export function buildLogEntry(level: LogLevel, message: string, meta?: unknown): string {
  const payload = {
    timestamp: new Date().toISOString(),
    level,
    message,
    meta: maskForLog(meta)
  };
  return JSON.stringify(payload);
}
