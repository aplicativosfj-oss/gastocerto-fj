CREATE TABLE public.gas_refills (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  refill_date date NOT NULL,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  size_kg numeric(6,2) NOT NULL DEFAULT 13,
  supplier text,
  payment_method text,
  notes text,
  transaction_id uuid REFERENCES public.transactions(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.gas_refills TO authenticated;
GRANT ALL ON public.gas_refills TO service_role;

ALTER TABLE public.gas_refills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gas_refills_select_own" ON public.gas_refills
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "gas_refills_insert_own" ON public.gas_refills
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "gas_refills_update_own" ON public.gas_refills
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "gas_refills_delete_own" ON public.gas_refills
  FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE INDEX gas_refills_user_date_idx ON public.gas_refills (user_id, refill_date DESC);

CREATE TRIGGER update_gas_refills_updated_at
  BEFORE UPDATE ON public.gas_refills
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "admin_logs_select_target_user" ON public.admin_logs
  FOR SELECT TO authenticated USING (target_user_id = auth.uid());