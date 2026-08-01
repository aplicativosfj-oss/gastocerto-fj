CREATE TABLE public.integration_credentials (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider text NOT NULL UNIQUE,
  public_key text,
  access_token text,
  environment text NOT NULL DEFAULT 'production',
  active boolean NOT NULL DEFAULT true,
  rotated_at timestamp with time zone,
  updated_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT ALL ON public.integration_credentials TO service_role;

ALTER TABLE public.integration_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Somente o servidor acessa credenciais" ON public.integration_credentials
FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TRIGGER update_integration_credentials_updated_at
BEFORE UPDATE ON public.integration_credentials
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();