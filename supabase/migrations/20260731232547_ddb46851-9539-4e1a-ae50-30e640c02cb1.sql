CREATE TABLE public.closed_period_audit (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  actor_id uuid,
  entity text NOT NULL,
  record_id uuid,
  action text NOT NULL,
  year integer NOT NULL,
  month integer NOT NULL,
  changes jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.closed_period_audit TO authenticated;
GRANT ALL ON public.closed_period_audit TO service_role;

ALTER TABLE public.closed_period_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "closed_audit_select_own" ON public.closed_period_audit
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "closed_audit_select_staff" ON public.closed_period_audit
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'support'));

CREATE INDEX closed_period_audit_user_idx
  ON public.closed_period_audit (user_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.log_closed_period_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  row_user uuid;
  ref_date date;
  ref_year integer;
  ref_month integer;
  has_closing boolean;
  payload jsonb;
BEGIN
  IF TG_OP = 'DELETE' THEN
    row_user := OLD.user_id;
    ref_date := OLD.transaction_date;
  ELSE
    row_user := NEW.user_id;
    ref_date := NEW.transaction_date;
  END IF;

  ref_year := EXTRACT(YEAR FROM ref_date)::int;
  ref_month := EXTRACT(MONTH FROM ref_date)::int;

  SELECT EXISTS (
    SELECT 1 FROM public.monthly_closings mc
    WHERE mc.user_id = row_user AND mc.year = ref_year AND mc.month = ref_month
  ) INTO has_closing;

  IF NOT has_closing THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_OP = 'INSERT' THEN
    payload := jsonb_build_object(
      'after', jsonb_build_object(
        'description', NEW.description,
        'amount', NEW.amount,
        'transaction_date', NEW.transaction_date,
        'transaction_type', NEW.transaction_type,
        'status', NEW.status
      )
    );
  ELSIF TG_OP = 'DELETE' THEN
    payload := jsonb_build_object(
      'before', jsonb_build_object(
        'description', OLD.description,
        'amount', OLD.amount,
        'transaction_date', OLD.transaction_date,
        'transaction_type', OLD.transaction_type,
        'status', OLD.status
      )
    );
  ELSE
    payload := jsonb_build_object(
      'before', jsonb_build_object(
        'description', OLD.description,
        'amount', OLD.amount,
        'transaction_date', OLD.transaction_date,
        'transaction_type', OLD.transaction_type,
        'status', OLD.status,
        'deleted_at', OLD.deleted_at
      ),
      'after', jsonb_build_object(
        'description', NEW.description,
        'amount', NEW.amount,
        'transaction_date', NEW.transaction_date,
        'transaction_type', NEW.transaction_type,
        'status', NEW.status,
        'deleted_at', NEW.deleted_at
      )
    );
  END IF;

  INSERT INTO public.closed_period_audit
    (user_id, actor_id, entity, record_id, action, year, month, changes)
  VALUES (
    row_user,
    auth.uid(),
    'transactions',
    COALESCE(NEW.id, OLD.id),
    lower(TG_OP),
    ref_year,
    ref_month,
    payload
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

REVOKE ALL ON FUNCTION public.log_closed_period_change() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER log_closed_period_transactions
AFTER INSERT OR UPDATE OR DELETE ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.log_closed_period_change();