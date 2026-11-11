import { supabase } from "@/integrations/supabase/client";
import { GENERIC_ERROR, MAX_TEMPLATE_TITLE } from "./hodhod-rules";

export type MessageTemplate = {
  id: string;
  title: string;
  body: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
};

export type TemplateInput = { title: string; body: string };

const COLUMNS = "id, title, body, is_default, created_at, updated_at";

/** Default template first, then most recently edited. */
export function sortTemplates(list: MessageTemplate[]): MessageTemplate[] {
  return [...list].sort((a, b) =>
    a.is_default !== b.is_default ? (a.is_default ? -1 : 1) : b.updated_at.localeCompare(a.updated_at),
  );
}

export async function fetchTemplates(): Promise<MessageTemplate[]> {
  const { data, error } = await supabase
    .from("message_templates")
    .select(COLUMNS)
    .order("updated_at", { ascending: false });
  if (error) throw new Error(GENERIC_ERROR);
  return sortTemplates(data ?? []);
}

export async function createTemplate(input: TemplateInput): Promise<MessageTemplate> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error(GENERIC_ERROR);
  const { data, error } = await supabase
    .from("message_templates")
    .insert({ title: input.title.trim(), body: input.body.trim(), user_id: auth.user.id })
    .select(COLUMNS)
    .single();
  if (error || !data) throw new Error(GENERIC_ERROR);
  return data;
}

export async function updateTemplate(id: string, input: TemplateInput): Promise<MessageTemplate> {
  const { data, error } = await supabase
    .from("message_templates")
    .update({ title: input.title.trim(), body: input.body.trim() })
    .eq("id", id)
    .select(COLUMNS)
    .single();
  if (error || !data) throw new Error(GENERIC_ERROR);
  return data;
}

export function duplicateTemplate(t: MessageTemplate): Promise<MessageTemplate> {
  return createTemplate({ title: `نسخة من ${t.title}`.slice(0, MAX_TEMPLATE_TITLE), body: t.body });
}

/** Makes one template the account's default (only one default per account). */
export async function setDefaultTemplate(id: string): Promise<void> {
  const { error: clearError } = await supabase
    .from("message_templates")
    .update({ is_default: false })
    .eq("is_default", true)
    .neq("id", id);
  if (clearError) throw new Error(GENERIC_ERROR);
  const { error } = await supabase.from("message_templates").update({ is_default: true }).eq("id", id);
  if (error) throw new Error(GENERIC_ERROR);
}

export async function deleteTemplate(id: string): Promise<void> {
  const { error } = await supabase.from("message_templates").delete().eq("id", id);
  if (error) throw new Error(GENERIC_ERROR);
}

export function formatArabicDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ar", { year: "numeric", month: "long", day: "numeric" });
}

/** Example values used to preview a template before it is sent. */
const SAMPLE_VALUES: Record<string, string> = {
  name: "أحمد محمد",
  الاسم: "أحمد محمد",
  phone: "+966551234567",
  الجوال: "+966551234567",
  amount: "150",
  المبلغ: "150",
  invoice_number: "INV-1001",
  رقم_الفاتورة: "INV-1001",
  due_date: "30 نوفمبر",
  تاريخ_الاستحقاق: "30 نوفمبر",
  التاريخ: "30 نوفمبر",
};

export function previewWithSample(body: string): string {
  return body.replace(/\{\{\s*([\p{L}\p{N}_]+)\s*\}\}/gu, (match, key: string) => SAMPLE_VALUES[key] ?? match);
}

const LAST_COLUMNS_KEY = "hodhod:last-document-columns";

/** Remembers only the column titles of the last opened file (never its rows) for the template editor. */
export function rememberDocumentColumns(columns: string[]) {
  try {
    localStorage.setItem(LAST_COLUMNS_KEY, JSON.stringify(columns.slice(0, 50)));
  } catch {
    /* storage unavailable */
  }
}

export function readDocumentColumns(): string[] {
  try {
    const raw = localStorage.getItem(LAST_COLUMNS_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((c): c is string => typeof c === "string") : [];
  } catch {
    return [];
  }
}
