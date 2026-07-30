
CREATE TABLE public.vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  vehicle_type text NOT NULL DEFAULT 'car',
  brand text,
  model text,
  year integer,
  plate text,
  fuel_type text NOT NULL DEFAULT 'gasolina',
  tank_capacity numeric,
  average_consumption numeric,
  initial_odometer numeric NOT NULL DEFAULT 0,
  color text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicles TO authenticated;
GRANT ALL ON public.vehicles TO service_role;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
CREATE POLICY vehicles_select_own ON public.vehicles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY vehicles_insert_own ON public.vehicles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY vehicles_update_own ON public.vehicles FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY vehicles_delete_own ON public.vehicles FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER vehicles_set_updated_at BEFORE UPDATE ON public.vehicles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.fuel_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  transaction_id uuid REFERENCES public.transactions(id) ON DELETE SET NULL,
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  odometer numeric NOT NULL,
  liters numeric NOT NULL,
  price_per_liter numeric NOT NULL,
  total_amount numeric NOT NULL,
  fuel_type text NOT NULL DEFAULT 'gasolina',
  station text,
  full_tank boolean NOT NULL DEFAULT true,
  distance numeric,
  consumption numeric,
  cost_per_km numeric,
  notes text,
  attachment_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX fuel_entries_vehicle_date_idx ON public.fuel_entries (vehicle_id, entry_date DESC, odometer DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fuel_entries TO authenticated;
GRANT ALL ON public.fuel_entries TO service_role;
ALTER TABLE public.fuel_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY fuel_select_own ON public.fuel_entries FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY fuel_insert_own ON public.fuel_entries FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY fuel_update_own ON public.fuel_entries FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY fuel_delete_own ON public.fuel_entries FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER fuel_entries_set_updated_at BEFORE UPDATE ON public.fuel_entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.recurring_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  description text NOT NULL,
  amount numeric NOT NULL,
  transaction_type transaction_type NOT NULL DEFAULT 'expense',
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL,
  payment_method text,
  frequency text NOT NULL DEFAULT 'monthly',
  day_of_month integer,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  is_essential boolean NOT NULL DEFAULT false,
  notes text,
  active boolean NOT NULL DEFAULT true,
  last_generated_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recurring_rules TO authenticated;
GRANT ALL ON public.recurring_rules TO service_role;
ALTER TABLE public.recurring_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY recurring_select_own ON public.recurring_rules FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY recurring_insert_own ON public.recurring_rules FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY recurring_update_own ON public.recurring_rules FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY recurring_delete_own ON public.recurring_rules FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER recurring_rules_set_updated_at BEFORE UPDATE ON public.recurring_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX transactions_recurring_unique
  ON public.transactions (recurring_rule_id, due_date)
  WHERE recurring_rule_id IS NOT NULL;
