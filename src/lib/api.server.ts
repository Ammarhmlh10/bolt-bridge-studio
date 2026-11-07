// Shared helpers for the phone-app HTTP API under /api/public/v1/*.
// Every handler authenticates the caller itself with the user's access token.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";

export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, Accept",
  "Access-Control-Max-Age": "86400",
} as const;

export type ApiErrorCode =
  | "unauthorized"
  | "bad_request"
  | "not_found"
  | "payload_too_large"
  | "unsupported_file"
  | "unprocessable"
  | "rate_limited"
  | "ai_credits"
  | "server_error";

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...CORS_HEADERS },
  });
}

export function apiError(status: number, code: ApiErrorCode, message: string, details?: unknown): Response {
  return json({ error: { code, message, ...(details !== undefined ? { details } : {}) } }, status);
}

export function preflight(): Response {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: ApiErrorCode,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export type AuthedContext = { supabase: SupabaseClient<Database>; userId: string };

function supabaseFetch(key: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(init?.headers);
    if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
    headers.set("apikey", key);
    return fetch(input, { ...init, headers });
  };
}

/** Verifies the Bearer access token and returns a database client that acts as that user. */
export async function authenticate(request: Request): Promise<AuthedContext> {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) throw new ApiError(500, "server_error", "إعدادات الخادم غير مكتملة.");

  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token || token.split(".").length !== 3) {
    throw new ApiError(401, "unauthorized", "يلزم تسجيل الدخول. أرسل رمز الدخول في ترويسة Authorization.");
  }

  const supabase = createClient<Database>(url, key, {
    global: { fetch: supabaseFetch(key), headers: { Authorization: `Bearer ${token}` } },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.auth.getClaims(token);
  const userId = data?.claims?.sub;
  if (error || !userId) throw new ApiError(401, "unauthorized", "انتهت صلاحية الدخول. سجّل الدخول مرة أخرى.");
  return { supabase, userId };
}

/** Runs a handler, turning thrown ApiErrors (and anything else) into JSON responses with CORS. */
export async function handle(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof ApiError) return apiError(err.status, err.code, err.message, err.details);
    console.error("[api] unexpected error", err);
    return apiError(500, "server_error", "حدث خطأ غير متوقع في الخادم. حاول مرة أخرى.");
  }
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new ApiError(400, "bad_request", "صيغة الطلب غير صحيحة (JSON).");
  }
}
