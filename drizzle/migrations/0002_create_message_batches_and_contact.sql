-- Prepared message batches returned to the phone app
CREATE TABLE public.message_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  template_id uuid REFERENCES public.message_templates(id) ON DELETE SET NULL,
  template_title text NOT NULL DEFAULT '' CHECK (length(template_title) <= 100),
  source_name text NOT NULL DEFAULT '' CHECK (length(source_name) <= 255),
  source_type text NOT NULL CHECK (source_type IN ('csv', 'xlsx', 'pdf', 'json')),
  status text NOT NULL DEFAULT 'ready' CHECK (status IN ('ready', 'sending', 'completed')),
  total_count int NOT NULL DEFAULT 0,
  ready_count int NOT NULL DEFAULT 0,
  sent_count int NOT NULL DEFAULT 0,
  failed_count int NOT NULL DEFAULT 0,
  skipped_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.message_batches TO authenticated;
GRANT ALL ON public.message_batches TO service_role;
ALTER TABLE public.message_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_own_batches" ON public.message_batches FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_batches" ON public.message_batches FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_batches" ON public.message_batches FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_batches" ON public.message_batches FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX idx_message_batches_user_created ON public.message_batches(user_id, created_at DESC);
CREATE TRIGGER trg_message_batches_updated BEFORE UPDATE ON public.message_batches FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.prepared_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES public.message_batches(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  position int NOT NULL,
  recipient_name text NOT NULL DEFAULT '',
  phone text,
  email text,
  body text NOT NULL,
  variables jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'skipped')),
  error text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.prepared_messages TO authenticated;
GRANT ALL ON public.prepared_messages TO service_role;
ALTER TABLE public.prepared_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_own_prepared" ON public.prepared_messages FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_prepared" ON public.prepared_messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.message_batches b WHERE b.id = batch_id AND b.user_id = auth.uid()));
CREATE POLICY "update_own_prepared" ON public.prepared_messages FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_prepared" ON public.prepared_messages FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX idx_prepared_messages_batch ON public.prepared_messages(batch_id, position);
CREATE INDEX idx_prepared_messages_user ON public.prepared_messages(user_id);
CREATE TRIGGER trg_prepared_messages_updated BEFORE UPDATE ON public.prepared_messages FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Contact form submissions from the public website (write-only for visitors)
CREATE TABLE public.contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(trim(name)) BETWEEN 2 AND 100),
  contact text NOT NULL CHECK (length(trim(contact)) BETWEEN 5 AND 150),
  message text NOT NULL CHECK (length(trim(message)) BETWEEN 10 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.contact_messages TO anon, authenticated;
GRANT ALL ON public.contact_messages TO service_role;
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "visitors_can_send_contact" ON public.contact_messages FOR INSERT TO anon, authenticated
  WITH CHECK (length(trim(name)) BETWEEN 2 AND 100 AND length(trim(contact)) BETWEEN 5 AND 150 AND length(trim(message)) BETWEEN 10 AND 2000);