CREATE TABLE public.gateway_connection_secrets (
  connection_id uuid PRIMARY KEY REFERENCES public.gateway_connections(id) ON DELETE CASCADE,
  api_key text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.gateway_connection_secrets TO service_role;
ALTER TABLE public.gateway_connection_secrets ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_gateway_connection_secrets_updated BEFORE UPDATE ON public.gateway_connection_secrets FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.gateway_connection_secrets (connection_id, api_key)
SELECT id, api_key FROM public.gateway_connections WHERE api_key IS NOT NULL;

ALTER TABLE public.gateway_connections ALTER COLUMN api_key DROP NOT NULL;
UPDATE public.gateway_connections SET api_key = NULL;
COMMENT ON COLUMN public.gateway_connections.api_key IS 'DEPRECATED: keys live in gateway_connection_secrets (server-only)';
ALTER TABLE public.gateway_connections ADD CONSTRAINT gateway_connections_api_key_unused CHECK (api_key IS NULL);

GRANT SELECT ON public.gateway_connections TO authenticated;
