import { supabase } from "@/integrations/supabase/client";
import { GENERIC_ERROR } from "./hodhod-rules";

export type MessageTemplate = {
  id: string;
  title: string;
  body: string;
  created_at: string;
  updated_at: string;
};

export type TemplateInput = { title: string; body: string };

const COLUMNS = "id, title, body, created_at, updated_at";

export async function fetchTemplates(): Promise<MessageTemplate[]> {
  const { data, error } = await supabase
    .from("message_templates")
    .select(COLUMNS)
    .order("updated_at", { ascending: false });
  if (error) throw new Error(GENERIC_ERROR);
  return data ?? [];
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

export async function deleteTemplate(id: string): Promise<void> {
  const { error } = await supabase.from("message_templates").delete().eq("id", id);
  if (error) throw new Error(GENERIC_ERROR);
}

export function formatArabicDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ar", { year: "numeric", month: "short", day: "numeric" });
}
