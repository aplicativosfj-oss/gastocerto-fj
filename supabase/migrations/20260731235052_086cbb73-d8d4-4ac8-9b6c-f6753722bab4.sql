CREATE TABLE public.app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

GRANT SELECT, INSERT, UPDATE ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "app_settings_select_authenticated" ON public.app_settings
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "app_settings_insert_admin" ON public.app_settings
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "app_settings_update_admin" ON public.app_settings
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.app_settings (key, value) VALUES
  ('ai_limits', jsonb_build_object(
    'rateWindowSeconds', 60,
    'rateMaxInWindow', 5,
    'burstWindowSeconds', 3600,
    'rateMaxInBurstWindow', 30,
    'monthlyQueryLimit', 120,
    'monthlyCreditAllowance', 50,
    'lowCreditRatio', 0.2
  ))
ON CONFLICT (key) DO NOTHING;

ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS tier text NOT NULL DEFAULT 'paid',
  ADD COLUMN IF NOT EXISTS trial_days integer;

UPDATE public.plans SET tier = 'free' WHERE slug = 'free';
UPDATE public.plans SET tier = 'paid' WHERE slug = 'premium';

INSERT INTO public.plans (name, slug, description, monthly_price, annual_price, transaction_limit, vehicle_limit, features, active, tier, trial_days)
VALUES
  ('Teste 7 dias', 'trial_7', 'Todos os recursos liberados por 7 dias.', 0, 0, NULL, NULL,
    '["Todos os recursos liberados","Consultor de IA incluído","Combustível e veículos","Relatórios e exportações"]'::jsonb, true, 'trial', 7),
  ('Teste 15 dias', 'trial_15', 'Todos os recursos liberados por 15 dias.', 0, 0, NULL, NULL,
    '["Todos os recursos liberados","Consultor de IA incluído","Combustível e veículos","Relatórios e exportações"]'::jsonb, true, 'trial', 15),
  ('Teste 30 dias', 'trial_30', 'Todos os recursos liberados por 30 dias.', 0, 0, NULL, NULL,
    '["Todos os recursos liberados","Consultor de IA incluído","Combustível e veículos","Relatórios e exportações"]'::jsonb, true, 'trial', 30)
ON CONFLICT (slug) DO UPDATE SET tier = EXCLUDED.tier, trial_days = EXCLUDED.trial_days, features = EXCLUDED.features, active = true;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS trial_plan_slug text,
  ADD COLUMN IF NOT EXISTS trial_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz;