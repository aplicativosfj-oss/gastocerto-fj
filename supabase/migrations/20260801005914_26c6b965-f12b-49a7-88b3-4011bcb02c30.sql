CREATE TABLE IF NOT EXISTS public.blocked_ips (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ip text NOT NULL UNIQUE,
  reason text,
  target_user_id uuid,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.blocked_ips TO authenticated;
GRANT ALL ON public.blocked_ips TO service_role;

ALTER TABLE public.blocked_ips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage blocked ips"
ON public.blocked_ips FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_blocked_ips_updated_at
BEFORE UPDATE ON public.blocked_ips
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS gas_alerts boolean NOT NULL DEFAULT true;

ALTER TABLE public.licenses
  ADD COLUMN IF NOT EXISTS trial_days integer;

INSERT INTO public.plans (name, slug, description, monthly_price, annual_price, tier, trial_days, features, active)
SELECT 'Teste 7 dias', 'trial_7_basic',
  'Licença de teste doada pelo administrador: 7 dias com recursos limitados e sem Consultor de IA.',
  0, 0, 'trial', 7,
  '{"ai": false, "limited": true}'::jsonb, true
WHERE NOT EXISTS (SELECT 1 FROM public.plans WHERE slug = 'trial_7_basic');