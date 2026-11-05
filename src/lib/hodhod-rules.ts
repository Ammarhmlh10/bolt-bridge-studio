// Pure business rules shared by the browser and the server.

export const MAX_SENDER_LENGTH = 11;
export const BATCH_SIZE_RANGE = { min: 10, max: 100, step: 10 } as const;
export const RETRIES_RANGE = { min: 0, max: 5, step: 1 } as const;
export const DEFAULT_BATCH_SIZE = 50;
export const DEFAULT_MAX_RETRIES = 3;
export const MAX_TEMPLATE_TITLE = 100;
export const MAX_TEMPLATE_BODY = 1000;
export const MAX_CAMPAIGN_NAME = 200;

export const GENERIC_ERROR = "تعذر الاتصال بالخادم. حاول مرة أخرى.";

export function extractPlaceholders(body: string): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const match of body.matchAll(/\{\{\s*(\w+)\s*\}\}/g)) {
    const name = match[1];
    if (name && !seen.has(name)) {
      seen.add(name);
      result.push(name);
    }
  }
  return result;
}

export function replacePlaceholders(template: string, data: Record<string, string>): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, key: string) =>
    data[key] !== undefined ? data[key] : "",
  );
}

/** Returns the normalized https URL, or null when invalid. */
export function normalizeEndpoint(value: string): string | null {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function normalizeSender(value: unknown): string | null {
  const sender = typeof value === "string" ? value.trim() : "";
  if (sender.length === 0 || sender.length > MAX_SENDER_LENGTH) return null;
  return sender;
}

export function isIntegerInRange(value: unknown, range: { min: number; max: number }): value is number {
  return Number.isInteger(value) && (value as number) >= range.min && (value as number) <= range.max;
}

const PRIVATE_HOST_PATTERNS = [
  /^localhost$/i,
  /\.local$/i,
  /\.internal$/i,
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^169\.254\./,
  /^0\./,
  /^\[::1\]$/,
  /^\[f[cd]/i,
  /^\[fe80:/i,
];

export function isPrivateHost(hostname: string): boolean {
  return PRIVATE_HOST_PATTERNS.some((p) => p.test(hostname));
}

export type Subscriber = { email: string; name: string };

/** Accepts an array, { data: [...] } or { subscribers: [...] } response from the HodHod API. */
export function parseSubscribers(payload: unknown): Subscriber[] {
  const obj = (payload ?? {}) as Record<string, unknown>;
  const items: unknown[] = Array.isArray(payload)
    ? payload
    : Array.isArray(obj["data"])
      ? (obj["data"] as unknown[])
      : Array.isArray(obj["subscribers"])
        ? (obj["subscribers"] as unknown[])
        : [];
  const result: Subscriber[] = [];
  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    const raw = item as Record<string, unknown>;
    const email = raw["email"] ?? raw["address"] ?? "";
    const name = raw["name"] ?? raw["subscriber_name"] ?? raw["full_name"] ?? "";
    if (email) result.push({ email: String(email), name: String(name || "") });
  }
  return result;
}

export function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}
