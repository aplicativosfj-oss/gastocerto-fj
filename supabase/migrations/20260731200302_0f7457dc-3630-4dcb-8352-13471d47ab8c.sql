CREATE TABLE public.commitments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  commitment_type text NOT NULL DEFAULT 'outro',
  creditor text,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL,
  total_amount numeric NOT NULL DEFAULT 0,
  installments_total integer,
  installment_amount numeric,
  interest_rate numeric,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  due_day integer,
  next_due_date date,
  end_date date,
  payment_method text,
  status text NOT NULL DEFAULT 'open',
  is_open_account boolean NOT NULL DEFAULT false,
  contact text,
  notes text,
  color text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.commitments TO authenticated;
GRANT ALL ON public.commitments TO service_role;
ALTER TABLE public.commitments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "commitments_select_own" ON public.commitments FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "commitments_insert_own" ON public.commitments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "commitments_update_own" ON public.commitments FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "commitments_delete_own" ON public.commitments FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_commitments_updated_at BEFORE UPDATE ON public.commitments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX commitments_user_status_idx ON public.commitments (user_id, status);

CREATE TABLE public.commitment_entries (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  commitment_id uuid NOT NULL REFERENCES public.commitments(id) ON DELETE CASCADE,
  entry_type text NOT NULL DEFAULT 'payment',
  description text,
  amount numeric NOT NULL DEFAULT 0,
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date,
  installment_number integer,
  payment_method text,
  transaction_id uuid REFERENCES public.transactions(id) ON DELETE SET NULL,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.commitment_entries TO authenticated;
GRANT ALL ON public.commitment_entries TO service_role;
ALTER TABLE public.commitment_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "commitment_entries_select_own" ON public.commitment_entries FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "commitment_entries_insert_own" ON public.commitment_entries FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "commitment_entries_update_own" ON public.commitment_entries FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "commitment_entries_delete_own" ON public.commitment_entries FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_commitment_entries_updated_at BEFORE UPDATE ON public.commitment_entries
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX commitment_entries_commitment_idx ON public.commitment_entries (commitment_id, entry_date DESC);

CREATE TABLE public.purchase_audit_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_id uuid REFERENCES public.transactions(id) ON DELETE SET NULL,
  action text NOT NULL,
  actor_name text,
  source text NOT NULL DEFAULT 'quick_edit',
  changes jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.purchase_audit_log TO authenticated;
GRANT ALL ON public.purchase_audit_log TO service_role;
ALTER TABLE public.purchase_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "purchase_audit_select_own" ON public.purchase_audit_log FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "purchase_audit_insert_own" ON public.purchase_audit_log FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE INDEX purchase_audit_transaction_idx ON public.purchase_audit_log (transaction_id, created_at DESC);