ALTER TABLE public.dependents
  ADD COLUMN IF NOT EXISTS pin_code text,
  ADD COLUMN IF NOT EXISTS kids_mode_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS monthly_limit numeric,
  ADD COLUMN IF NOT EXISTS recurring_allowance_day integer,
  ADD COLUMN IF NOT EXISTS last_allowance_month text;

CREATE TABLE IF NOT EXISTS public.kids_savings_goals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  dependent_id uuid NOT NULL REFERENCES public.dependents(id) ON DELETE CASCADE,
  title text NOT NULL,
  target_amount numeric NOT NULL DEFAULT 0,
  current_amount numeric NOT NULL DEFAULT 0,
  icon text,
  reward text,
  completed_at timestamp with time zone,
  redeemed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.kids_savings_goals TO authenticated;
GRANT ALL ON public.kids_savings_goals TO service_role;

ALTER TABLE public.kids_savings_goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own kids goals" ON public.kids_savings_goals;
CREATE POLICY "Users manage own kids goals" ON public.kids_savings_goals
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_kids_savings_goals_updated_at ON public.kids_savings_goals;
CREATE TRIGGER update_kids_savings_goals_updated_at
  BEFORE UPDATE ON public.kids_savings_goals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();