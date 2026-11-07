// Browser client for the phone-app API (/api/public/v1). The web app uses the same endpoints as the phone.
import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { GENERIC_ERROR } from "./hodhod-rules";

export type BatchStatus = "ready" | "sending" | "completed";
export type MessageStatus = "pending" | "sent" | "failed" | "skipped";

export type Batch = {
  id: string;
  template_id: string | null;
  template_title: string;
  source_name: string;
  source_type: "csv" | "xlsx" | "pdf" | "json";
  status: BatchStatus;
  total_count: number;
  ready_count: number;
  sent_count: number;
  failed_count: number;
  skipped_count: number;
  created_at: string;
  updated_at: string;
};

export type BatchMessage = {
  id: string;
  position: number;
  recipient_name: string;
  phone: string | null;
  email: string | null;
  body: string;
  status: MessageStatus;
  error: string | null;
  sent_at: string | null;
};

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  let res: Response;
  try {
    res = await fetch(`/api/public/v1${path}`, { ...init, headers });
  } catch {
    throw new Error(GENERIC_ERROR);
  }
  const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
  if (!res.ok) throw new Error(body?.error?.message || GENERIC_ERROR);
  return body as T;
}

export function createBatchFromFile(file: File, templateId: string) {
  const form = new FormData();
  form.set("file", file);
  form.set("template_id", templateId);
  return apiFetch<{ batch: Batch; messages: BatchMessage[]; missing_variables: string[] }>("/batches", {
    method: "POST",
    body: form,
  });
}

export function deleteBatch(id: string) {
  return apiFetch<{ deleted: true }>(`/batches/${id}`, { method: "DELETE" });
}

export const batchesQuery = queryOptions({
  queryKey: ["batches"],
  queryFn: () => apiFetch<{ batches: Batch[] }>("/batches").then((r) => r.batches),
});

export const batchQuery = (id: string) =>
  queryOptions({
    queryKey: ["batches", id],
    queryFn: () => apiFetch<{ batch: Batch; messages: BatchMessage[] }>(`/batches/${id}`),
  });

export const SOURCE_LABELS: Record<Batch["source_type"], string> = {
  csv: "CSV",
  xlsx: "Excel",
  pdf: "PDF",
  json: "من التطبيق",
};

export const BATCH_STATUS_LABELS: Record<BatchStatus, string> = {
  ready: "جاهزة للإرسال",
  sending: "قيد الإرسال",
  completed: "مكتملة",
};

export const MESSAGE_STATUS_LABELS: Record<MessageStatus, string> = {
  pending: "بانتظار الإرسال",
  sent: "أُرسلت",
  failed: "فشلت",
  skipped: "مستبعدة",
};
