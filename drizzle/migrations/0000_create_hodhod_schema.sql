-- Shared updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Message templates
CREATE TABLE public.message_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (length(trim(title)) >= 1 AND length(trim(title)) <= 100),
  body text NOT NULL CHECK (length(trim(body)) >= 1 AND length(body) <= 1000),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.message_templates TO authenticated;
GRANT ALL ON public.message_templates TO service_role;
ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_own_templates" ON public.message_templates FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_templates" ON public.message_templates FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_templates" ON public.message_templates FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_templates" ON public.message_templates FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX idx_message_templates_user_id ON public.message_templates(user_id);
CREATE TRIGGER trg_message_templates_updated BEFORE UPDATE ON public.message_templates FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Gateway connections (api_key is write-only for the browser)
CREATE TABLE public.gateway_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint_url text NOT NULL,
  sender_name text NOT NULL CHECK (length(trim(sender_name)) >= 1 AND length(sender_name) <= 11),
  api_key text NOT NULL,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT (id, endpoint_url, sender_name, user_id, created_at, updated_at) ON public.gateway_connections TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.gateway_connections TO authenticated;
GRANT ALL ON public.gateway_connections TO service_role;
ALTER TABLE public.gateway_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_own_connections" ON public.gateway_connections FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_connections" ON public.gateway_connections FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_connections" ON public.gateway_connections FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_connections" ON public.gateway_connections FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX idx_gateway_connections_user_id ON public.gateway_connections(user_id);
CREATE TRIGGER trg_gateway_connections_updated BEFORE UPDATE ON public.gateway_connections FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Per-user sending preferences
CREATE TABLE public.gateway_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE DEFAULT auth.uid(),
  batch_size smallint NOT NULL DEFAULT 50 CHECK (batch_size BETWEEN 10 AND 100),
  max_retries smallint NOT NULL DEFAULT 3 CHECK (max_retries BETWEEN 0 AND 5),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gateway_settings TO authenticated;
GRANT ALL ON public.gateway_settings TO service_role;
ALTER TABLE public.gateway_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_own_settings" ON public.gateway_settings FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_settings" ON public.gateway_settings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_settings" ON public.gateway_settings FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_settings" ON public.gateway_settings FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER trg_gateway_settings_updated BEFORE UPDATE ON public.gateway_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Campaigns
CREATE TABLE public.campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(trim(name)) >= 1 AND length(trim(name)) <= 200),
  template_id uuid REFERENCES public.message_templates(id) ON DELETE SET NULL,
  connection_id uuid REFERENCES public.gateway_connections(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sending', 'completed', 'failed')),
  total_recipients int NOT NULL DEFAULT 0,
  sent_count int NOT NULL DEFAULT 0,
  failed_count int NOT NULL DEFAULT 0,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaigns TO authenticated;
GRANT ALL ON public.campaigns TO service_role;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_own_campaigns" ON public.campaigns FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_campaigns" ON public.campaigns FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_campaigns" ON public.campaigns FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_campaigns" ON public.campaigns FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX idx_campaigns_user_id ON public.campaigns(user_id);
CREATE TRIGGER trg_campaigns_updated BEFORE UPDATE ON public.campaigns FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Campaign recipients (ownership through parent campaign)
CREATE TABLE public.campaign_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  subscriber_email text NOT NULL,
  subscriber_name text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  error_message text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_recipients TO authenticated;
GRANT ALL ON public.campaign_recipients TO service_role;
ALTER TABLE public.campaign_recipients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_own_recipients" ON public.campaign_recipients FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.campaigns c WHERE c.id = campaign_recipients.campaign_id AND c.user_id = auth.uid()));
CREATE POLICY "insert_own_recipients" ON public.campaign_recipients FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.campaigns c WHERE c.id = campaign_recipients.campaign_id AND c.user_id = auth.uid()));
CREATE POLICY "update_own_recipients" ON public.campaign_recipients FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.campaigns c WHERE c.id = campaign_recipients.campaign_id AND c.user_id = auth.uid()))
  WITH CHECK (
  EXISTS (SELECT 1 FROM public.campaigns c WHERE c.id = campaign_recipients.campaign_id AND c.user_id = auth.uid()));
CREATE POLICY "delete_own_recipients" ON public.campaign_recipients FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.campaigns c WHERE c.id = campaign_recipients.campaign_id AND c.user_id = auth.uid()));
CREATE INDEX idx_recipients_campaign_id ON public.campaign_recipients(campaign_id);

-- Source-to-Lovable user mapping for the pending user import (server-only)
CREATE TABLE public.legacy_user_map (
  legacy_user_id uuid PRIMARY KEY,
  email text NOT NULL,
  new_user_id uuid UNIQUE,
  linked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.legacy_user_map TO service_role;
ALTER TABLE public.legacy_user_map ENABLE ROW LEVEL SECURITY;
