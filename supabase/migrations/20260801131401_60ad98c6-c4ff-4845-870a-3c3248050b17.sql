CREATE TABLE public.checkout_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  cpf text NOT NULL,
  full_name text NOT NULL,
  plan_slug text NOT NULL,
  billing_cycle text NOT NULL,
  code_hash text NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  verified_at timestamptz,
  consumed_at timestamptz,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.checkout_verifications TO service_role;

ALTER TABLE public.checkout_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view checkout verifications"
ON public.checkout_verifications FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_checkout_verifications_email ON public.checkout_verifications (lower(email), created_at DESC);

CREATE TRIGGER update_checkout_verifications_updated_at
BEFORE UPDATE ON public.checkout_verifications
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();