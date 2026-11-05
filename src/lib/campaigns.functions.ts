import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  BATCH_SIZE_RANGE,
  DEFAULT_BATCH_SIZE,
  DEFAULT_MAX_RETRIES,
  RETRIES_RANGE,
  chunk,
  isIntegerInRange,
  replacePlaceholders,
  type Subscriber,
} from "./hodhod-rules";
import { fetchHodHodSubscribers, loadConnectionSecret, sendSingleMessage } from "./hodhod.server";

export type Campaign = {
  id: string;
  name: string;
  template_id: string | null;
  connection_id: string | null;
  status: "draft" | "sending" | "completed" | "failed";
  total_recipients: number;
  sent_count: number;
  failed_count: number;
  created_at: string;
  updated_at: string;
};

export type SendResult = {
  campaign_id: string;
  total: number;
  sent: number;
  failed: number;
  status: "completed" | "failed";
};

export const listCampaigns = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("campaigns")
      .select(
        "id, name, template_id, connection_id, status, total_recipients, sent_count, failed_count, created_at, updated_at",
      )
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as Campaign[];
  });

export const fetchSubscribers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input) => z.object({ connection_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<Subscriber[]> => {
    const conn = await loadConnectionSecret(context.userId, data.connection_id);
    if (!conn) throw new Error("الخدمة غير موجودة");
    return fetchHodHodSubscribers(conn.api_key, conn.endpoint_url);
  });

export const sendCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input) =>
    z
      .object({
        connection_id: z.string().uuid(),
        template_id: z.string().uuid(),
        campaign_name: z.string(),
        batch_size: z.number().optional(),
        max_retries: z.number().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<SendResult> => {
    const { supabase, userId } = context;
    const name = data.campaign_name.trim();
    if (!name) throw new Error("أدخل اسم الحملة");
    const batchSize = isIntegerInRange(data.batch_size, BATCH_SIZE_RANGE) ? data.batch_size : DEFAULT_BATCH_SIZE;
    const maxRetries = isIntegerInRange(data.max_retries, RETRIES_RANGE) ? data.max_retries : DEFAULT_MAX_RETRIES;

    const conn = await loadConnectionSecret(userId, data.connection_id);
    if (!conn) throw new Error("الخدمة غير موجودة");

    const { data: tmpl } = await supabase
      .from("message_templates")
      .select("body")
      .eq("id", data.template_id)
      .maybeSingle();
    if (!tmpl) throw new Error("القالب غير موجود");

    const subscribers = await fetchHodHodSubscribers(conn.api_key, conn.endpoint_url);
    if (subscribers.length === 0) throw new Error("لا يوجد مشتركون لدى الخدمة");

    const { data: campaign, error: campError } = await supabase
      .from("campaigns")
      .insert({
        name,
        template_id: data.template_id,
        connection_id: data.connection_id,
        status: "sending",
        total_recipients: subscribers.length,
        user_id: userId,
      })
      .select("id")
      .single();
    if (campError || !campaign) throw new Error("تعذر إنشاء الحملة");

    const { data: recipients, error: recipError } = await supabase
      .from("campaign_recipients")
      .insert(
        subscribers.map((s) => ({
          campaign_id: campaign.id,
          subscriber_email: s.email,
          subscriber_name: s.name,
          status: "pending",
        })),
      )
      .select("id, subscriber_email, subscriber_name");
    if (recipError || !recipients) {
      await supabase.from("campaigns").update({ status: "failed" }).eq("id", campaign.id);
      throw new Error("تعذر تجهيز قائمة المستلمين");
    }

    let sent = 0;
    let failed = 0;

    for (const batch of chunk(recipients, batchSize)) {
      const results = await Promise.all(
        batch.map(async (r) => {
          const message = replacePlaceholders(tmpl.body, {
            name: r.subscriber_name ?? "",
            email: r.subscriber_email,
          });
          let lastError: string | undefined;
          for (let attempt = 0; attempt <= maxRetries; attempt++) {
            const res = await sendSingleMessage(conn.endpoint_url, conn.api_key, conn.sender_name, r.subscriber_email, message);
            if (res.success) return { id: r.id, success: true as const };
            lastError = res.error;
          }
          return { id: r.id, success: false as const, error: lastError ?? "Unknown error" };
        }),
      );

      const sentIds = results.filter((r) => r.success).map((r) => r.id);
      if (sentIds.length > 0) {
        await supabase
          .from("campaign_recipients")
          .update({ status: "sent", sent_at: new Date().toISOString() })
          .in("id", sentIds);
      }
      for (const r of results) {
        if (!r.success) {
          await supabase
            .from("campaign_recipients")
            .update({ status: "failed", error_message: r.error.slice(0, 500) })
            .eq("id", r.id);
        }
      }
      sent += sentIds.length;
      failed += results.length - sentIds.length;

      await supabase.from("campaigns").update({ sent_count: sent, failed_count: failed }).eq("id", campaign.id);
    }

    const status: SendResult["status"] = sent > 0 ? "completed" : "failed";
    await supabase.from("campaigns").update({ status }).eq("id", campaign.id);

    return { campaign_id: campaign.id, total: recipients.length, sent, failed, status };
  });
