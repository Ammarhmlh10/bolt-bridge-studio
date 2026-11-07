import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  BATCH_SIZE_RANGE,
  DEFAULT_BATCH_SIZE,
  DEFAULT_MAX_RETRIES,
  MAX_SENDER_LENGTH,
  RETRIES_RANGE,
  isIntegerInRange,
  normalizeEndpoint,
  normalizeSender,
} from "./hodhod-rules";
import { loadConnectionSecret, probeEndpoint, saveConnectionSecret } from "./hodhod.server";

export type GatewayConnection = {
  id: string;
  endpoint_url: string;
  sender_name: string;
  created_at: string;
  updated_at: string;
};

export type GatewaySettings = {
  connections: GatewayConnection[];
  batch_size: number;
  max_retries: number;
  updated_at: string;
};

const PUBLIC_COLUMNS = "id, endpoint_url, sender_name, created_at, updated_at";
const ENDPOINT_ERROR = "يجب أن يكون عنوان الخدمة صحيحاً ويبدأ بـ https://";
const SENDER_ERROR = `اسم المرسل يجب أن يكون بين 1 و ${MAX_SENDER_LENGTH} حرفاً`;
const NOT_FOUND = "الخدمة غير موجودة";

type AuthedClient = SupabaseClient<Database>;

async function loadSettings(supabase: AuthedClient, userId: string): Promise<GatewaySettings> {
  let { data: prefs, error } = await supabase
    .from("gateway_settings")
    .select("batch_size, max_retries, updated_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!prefs) {
    const inserted = await supabase
      .from("gateway_settings")
      .insert({ user_id: userId, batch_size: DEFAULT_BATCH_SIZE, max_retries: DEFAULT_MAX_RETRIES })
      .select("batch_size, max_retries, updated_at")
      .single();
    if (inserted.error) throw inserted.error;
    prefs = inserted.data;
  }
  const { data: connections, error: connError } = await supabase
    .from("gateway_connections")
    .select(PUBLIC_COLUMNS)
    .order("created_at", { ascending: true });
  if (connError) throw connError;
  return {
    connections: connections ?? [],
    batch_size: prefs.batch_size,
    max_retries: prefs.max_retries,
    updated_at: prefs.updated_at,
  };
}

export const getGatewaySettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => loadSettings(context.supabase, context.userId));

export const createGatewayConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input) =>
    z.object({ endpoint_url: z.string(), sender_name: z.string(), api_key: z.string() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const endpoint = normalizeEndpoint(data.endpoint_url);
    if (!endpoint) throw new Error(ENDPOINT_ERROR);
    const sender = normalizeSender(data.sender_name);
    if (!sender) throw new Error(SENDER_ERROR);
    const key = data.api_key.trim();
    if (!key) throw new Error("أدخل مفتاح الربط");
    const { data: row, error } = await context.supabase
      .from("gateway_connections")
      .insert({ endpoint_url: endpoint, sender_name: sender, user_id: context.userId })
      .select(PUBLIC_COLUMNS)
      .single();
    if (error) throw error;
    try {
      await saveConnectionSecret(row.id, key);
    } catch (err) {
      await context.supabase.from("gateway_connections").delete().eq("id", row.id);
      throw err;
    }
    return row as GatewayConnection;
  });

export const updateGatewayConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input) =>
    z
      .object({
        id: z.string().uuid(),
        endpoint_url: z.string().optional(),
        sender_name: z.string().optional(),
        api_key: z.string().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const changes: { endpoint_url?: string; sender_name?: string } = {};
    if (data.endpoint_url !== undefined) {
      const endpoint = normalizeEndpoint(data.endpoint_url);
      if (!endpoint) throw new Error(ENDPOINT_ERROR);
      changes.endpoint_url = endpoint;
    }
    if (data.sender_name !== undefined) {
      const sender = normalizeSender(data.sender_name);
      if (!sender) throw new Error(SENDER_ERROR);
      changes.sender_name = sender;
    }
    // RLS limits the update to the caller's own row; no row back means not found / not owned.
    const { data: row, error } = await context.supabase
      .from("gateway_connections")
      .update({ ...changes, updated_at: new Date().toISOString() })
      .eq("id", data.id)
      .select(PUBLIC_COLUMNS)
      .maybeSingle();
    if (error) throw error;
    if (!row) throw new Error(NOT_FOUND);
    if (data.api_key && data.api_key.trim()) await saveConnectionSecret(row.id, data.api_key.trim());
    return row as GatewayConnection;
  });

export const deleteGatewayConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("gateway_connections")
      .delete()
      .eq("id", data.id)
      .select("id");
    if (error) throw error;
    if (!rows || rows.length === 0) throw new Error(NOT_FOUND);
    return { deleted: true, id: data.id };
  });

export const testGatewayConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const conn = await loadConnectionSecret(context.userId, data.id);
    if (!conn) throw new Error(NOT_FOUND);
    return probeEndpoint(conn.endpoint_url);
  });

export const saveSendingPreferences = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input) => z.object({ batch_size: z.number(), max_retries: z.number() }).parse(input))
  .handler(async ({ data, context }) => {
    if (!isIntegerInRange(data.batch_size, BATCH_SIZE_RANGE)) {
      throw new Error(`عدد الرسائل في الدفعة يجب أن يكون بين ${BATCH_SIZE_RANGE.min} و ${BATCH_SIZE_RANGE.max}`);
    }
    if (!isIntegerInRange(data.max_retries, RETRIES_RANGE)) {
      throw new Error(`المحاولات يجب أن تكون بين ${RETRIES_RANGE.min} و ${RETRIES_RANGE.max}`);
    }
    await loadSettings(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("gateway_settings")
      .update({ batch_size: data.batch_size, max_retries: data.max_retries })
      .eq("user_id", context.userId);
    if (error) throw error;
    return loadSettings(context.supabase, context.userId);
  });
