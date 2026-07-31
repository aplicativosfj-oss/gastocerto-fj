CREATE TABLE public.transaction_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  transaction_id uuid NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  name text NOT NULL,
  unit text NOT NULL DEFAULT 'un',
  quantity numeric NOT NULL DEFAULT 1,
  weight numeric,
  unit_price numeric,
  total_amount numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.transaction_items TO authenticated;
GRANT ALL ON public.transaction_items TO service_role;
ALTER TABLE public.transaction_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "items_select_own" ON public.transaction_items FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "items_insert_own" ON public.transaction_items FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "items_update_own" ON public.transaction_items FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "items_delete_own" ON public.transaction_items FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX transaction_items_transaction_idx ON public.transaction_items(transaction_id);
CREATE INDEX transaction_items_user_idx ON public.transaction_items(user_id);

CREATE TRIGGER update_transaction_items_updated_at
BEFORE UPDATE ON public.transaction_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.monthly_closings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  year integer NOT NULL,
  month integer NOT NULL,
  opening_balance numeric NOT NULL DEFAULT 0,
  total_income numeric NOT NULL DEFAULT 0,
  total_expense numeric NOT NULL DEFAULT 0,
  closing_balance numeric NOT NULL DEFAULT 0,
  closed_at timestamptz NOT NULL DEFAULT now(),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, year, month)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.monthly_closings TO authenticated;
GRANT ALL ON public.monthly_closings TO service_role;
ALTER TABLE public.monthly_closings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "closings_select_own" ON public.monthly_closings FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "closings_insert_own" ON public.monthly_closings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "closings_update_own" ON public.monthly_closings FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "closings_delete_own" ON public.monthly_closings FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_monthly_closings_updated_at
BEFORE UPDATE ON public.monthly_closings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();