// Prepared-message batches: create from records, read back, and record send results from the phone.
import { z } from "zod";

import { ApiError, type AuthedContext } from "./api.server";
import { MAX_BATCHES_LISTED, MAX_ROWS_PER_BATCH } from "./hodhod-rules";
import { prepareMessages } from "./message-prep";

export const BATCH_COLUMNS =
  "id, template_id, template_title, source_name, source_type, status, total_count, ready_count, sent_count, failed_count, skipped_count, created_at, updated_at";
export const MESSAGE_COLUMNS = "id, position, recipient_name, phone, email, body, variables, status, error, sent_at";

export const uuidSchema = z.string().uuid();

export async function listTemplates({ supabase }: AuthedContext) {
  const { data, error } = await supabase
    .from("message_templates")
    .select("id, title, body, updated_at")
    .order("updated_at", { ascending: false });
  if (error) throw new ApiError(500, "server_error", "تعذر تحميل القوالب.");
  return data ?? [];
}

export async function createBatch(
  ctx: AuthedContext,
  input: {
    templateId: string;
    sourceName: string;
    sourceType: "csv" | "xlsx" | "pdf" | "json";
    records: Record<string, unknown>[];
  },
) {
  const { supabase, userId } = ctx;
  if (!uuidSchema.safeParse(input.templateId).success) {
    throw new ApiError(400, "bad_request", "اختر قالب رسالة صالحاً (template_id).");
  }
  const { data: template, error: tplError } = await supabase
    .from("message_templates")
    .select("id, title, body")
    .eq("id", input.templateId)
    .maybeSingle();
  if (tplError) throw new ApiError(500, "server_error", "تعذر تحميل القالب.");
  if (!template) throw new ApiError(404, "not_found", "القالب غير موجود.");

  const { messages, missingVariables } = prepareMessages(template.body, input.records);
  if (messages.length === 0) throw new ApiError(422, "unprocessable", "لا توجد صفوف صالحة لتجهيز الرسائل.");
  if (messages.length > MAX_ROWS_PER_BATCH) {
    throw new ApiError(422, "unprocessable", `الحد الأقصى ${MAX_ROWS_PER_BATCH} رسالة في الدفعة الواحدة.`);
  }

  const ready = messages.filter((m) => m.status === "pending").length;
  const { data: batch, error: batchError } = await supabase
    .from("message_batches")
    .insert({
      user_id: userId,
      template_id: template.id,
      template_title: template.title.slice(0, 100),
      source_name: input.sourceName.slice(0, 255),
      source_type: input.sourceType,
      status: ready > 0 ? "ready" : "completed",
      total_count: messages.length,
      ready_count: ready,
      skipped_count: messages.length - ready,
    })
    .select(BATCH_COLUMNS)
    .single();
  if (batchError || !batch) throw new ApiError(500, "server_error", "تعذر حفظ الدفعة.");

  const rows = messages.map((m) => ({ ...m, batch_id: batch.id, user_id: userId }));
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await supabase.from("prepared_messages").insert(rows.slice(i, i + 500));
    if (error) {
      await supabase.from("message_batches").delete().eq("id", batch.id);
      throw new ApiError(500, "server_error", "تعذر حفظ الرسائل المجهزة.");
    }
  }

  const saved = await fetchMessages(ctx, batch.id);
  return { batch, messages: saved, missing_variables: missingVariables };
}

export async function listBatches({ supabase }: AuthedContext) {
  const { data, error } = await supabase
    .from("message_batches")
    .select(BATCH_COLUMNS)
    .order("created_at", { ascending: false })
    .limit(MAX_BATCHES_LISTED);
  if (error) throw new ApiError(500, "server_error", "تعذر تحميل الدفعات.");
  return data ?? [];
}

const statusFilter = z.enum(["pending", "sent", "failed", "skipped"]);

export async function fetchMessages(ctx: AuthedContext, batchId: string, status?: string | null) {
  let query = ctx.supabase
    .from("prepared_messages")
    .select(MESSAGE_COLUMNS)
    .eq("batch_id", batchId)
    .order("position", { ascending: true })
    .limit(MAX_ROWS_PER_BATCH);
  if (status) {
    const parsed = statusFilter.safeParse(status);
    if (!parsed.success) throw new ApiError(400, "bad_request", "قيمة status غير صحيحة.");
    query = query.eq("status", parsed.data);
  }
  const { data, error } = await query;
  if (error) throw new ApiError(500, "server_error", "تعذر تحميل الرسائل.");
  return data ?? [];
}

export async function getBatch(ctx: AuthedContext, batchId: string, status?: string | null) {
  if (!uuidSchema.safeParse(batchId).success) throw new ApiError(404, "not_found", "الدفعة غير موجودة.");
  const { data: batch, error } = await ctx.supabase
    .from("message_batches")
    .select(BATCH_COLUMNS)
    .eq("id", batchId)
    .maybeSingle();
  if (error) throw new ApiError(500, "server_error", "تعذر تحميل الدفعة.");
  if (!batch) throw new ApiError(404, "not_found", "الدفعة غير موجودة.");
  const messages = await fetchMessages(ctx, batchId, status);
  return { batch, messages };
}

export async function deleteBatch(ctx: AuthedContext, batchId: string) {
  if (!uuidSchema.safeParse(batchId).success) throw new ApiError(404, "not_found", "الدفعة غير موجودة.");
  const { data, error } = await ctx.supabase.from("message_batches").delete().eq("id", batchId).select("id");
  if (error) throw new ApiError(500, "server_error", "تعذر حذف الدفعة.");
  if (!data || data.length === 0) throw new ApiError(404, "not_found", "الدفعة غير موجودة.");
}

export const reportSchema = z.object({
  results: z
    .array(
      z.object({
        id: z.string().uuid(),
        status: z.enum(["sent", "failed", "pending"]),
        error: z.string().max(500).nullish(),
      }),
    )
    .min(1)
    .max(500),
});

/** Records what the phone app did with each message, then refreshes the batch counters. */
export async function reportResults(ctx: AuthedContext, batchId: string, body: unknown) {
  if (!uuidSchema.safeParse(batchId).success) throw new ApiError(404, "not_found", "الدفعة غير موجودة.");
  const parsed = reportSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(400, "bad_request", "صيغة النتائج غير صحيحة.", parsed.error.flatten().fieldErrors);
  }
  const { supabase } = ctx;
  const { data: batch } = await supabase.from("message_batches").select("id").eq("id", batchId).maybeSingle();
  if (!batch) throw new ApiError(404, "not_found", "الدفعة غير موجودة.");

  // Group identical updates so a large report costs few requests.
  const groups = new Map<string, { status: "sent" | "failed" | "pending"; error: string | null; ids: string[] }>();
  for (const r of parsed.data.results) {
    const error = r.status === "failed" ? (r.error?.trim() || "فشل الإرسال") : null;
    const key = `${r.status}\u0000${error ?? ""}`;
    const group = groups.get(key) ?? { status: r.status, error, ids: [] };
    group.ids.push(r.id);
    groups.set(key, group);
  }

  let updated = 0;
  for (const g of groups.values()) {
    const { data, error } = await supabase
      .from("prepared_messages")
      .update({ status: g.status, error: g.error, sent_at: g.status === "sent" ? new Date().toISOString() : null })
      .eq("batch_id", batchId)
      .neq("status", "skipped")
      .in("id", g.ids)
      .select("id");
    if (error) throw new ApiError(500, "server_error", "تعذر حفظ نتائج الإرسال.");
    updated += data?.length ?? 0;
  }

  const counts = await countStatuses(ctx, batchId);
  const status = counts.pending === 0 ? "completed" : counts.sent + counts.failed > 0 ? "sending" : "ready";
  const { data: refreshed, error: updError } = await supabase
    .from("message_batches")
    .update({
      status,
      ready_count: counts.pending,
      sent_count: counts.sent,
      failed_count: counts.failed,
      skipped_count: counts.skipped,
    })
    .eq("id", batchId)
    .select(BATCH_COLUMNS)
    .single();
  if (updError || !refreshed) throw new ApiError(500, "server_error", "تعذر تحديث الدفعة.");
  return { updated, ignored: parsed.data.results.length - updated, batch: refreshed };
}

async function countStatuses({ supabase }: AuthedContext, batchId: string) {
  const statuses = ["pending", "sent", "failed", "skipped"] as const;
  const entries = await Promise.all(
    statuses.map(async (s) => {
      const { count, error } = await supabase
        .from("prepared_messages")
        .select("id", { count: "exact", head: true })
        .eq("batch_id", batchId)
        .eq("status", s);
      if (error) throw new ApiError(500, "server_error", "تعذر حساب حالة الدفعة.");
      return [s, count ?? 0] as const;
    }),
  );
  return Object.fromEntries(entries) as Record<(typeof statuses)[number], number>;
}
