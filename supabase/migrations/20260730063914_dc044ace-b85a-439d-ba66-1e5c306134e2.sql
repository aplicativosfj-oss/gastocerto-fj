CREATE TYPE public.license_status AS ENUM ('pending', 'active', 'expired', 'revoked');

CREATE OR REPLACE FUNCTION public.generate_license_key()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  candidate text;
  block text;
  i int;
  j int;
BEGIN
  LOOP
    candidate := 'GC';
    FOR i IN 1..3 LOOP
      block := '';
      FOR j IN 1..4 LOOP
        block := block || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
      END LOOP;
      candidate := candidate || '-' || block;
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.licenses WHERE license_key = candidate);
  END LOOP;
  RETURN candidate;
END;
$$;

CREATE TABLE public.licenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  license_key text NOT NULL UNIQUE,
  plan_id uuid REFERENCES public.plans(id),
  user_id uuid,
  email text,
  full_name text,
  cpf text,
  status public.license_status NOT NULL DEFAULT 'pending',
  source text NOT NULL DEFAULT 'manual',
  billing_cycle text NOT NULL DEFAULT 'monthly',
  amount numeric NOT NULL DEFAULT 0,
  issued_at timestamp with time zone NOT NULL DEFAULT now(),
  activated_at timestamp with time zone,
  expires_at timestamp with time zone,
  notes text,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.licenses ALTER COLUMN license_key SET DEFAULT public.generate_license_key();

CREATE INDEX idx_licenses_user ON public.licenses(user_id);
CREATE INDEX idx_licenses_email ON public.licenses(lower(email));
CREATE INDEX idx_licenses_status ON public.licenses(status);

GRANT SELECT ON public.licenses TO authenticated;
GRANT ALL ON public.licenses TO service_role;
ALTER TABLE public.licenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios veem suas licencas"
ON public.licenses FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_licenses_updated_at
BEFORE UPDATE ON public.licenses
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id uuid REFERENCES public.licenses(id) ON DELETE SET NULL,
  user_id uuid,
  email text,
  provider text NOT NULL DEFAULT 'mercadopago',
  method text NOT NULL DEFAULT 'pix',
  external_id text,
  amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  qr_code text,
  qr_code_base64 text,
  ticket_url text,
  paid_at timestamp with time zone,
  raw jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_payments_user ON public.payments(user_id);
CREATE INDEX idx_payments_status ON public.payments(status);
CREATE UNIQUE INDEX idx_payments_external ON public.payments(provider, external_id) WHERE external_id IS NOT NULL;

GRANT SELECT ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios veem seus pagamentos"
ON public.payments FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_payments_updated_at
BEFORE UPDATE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();