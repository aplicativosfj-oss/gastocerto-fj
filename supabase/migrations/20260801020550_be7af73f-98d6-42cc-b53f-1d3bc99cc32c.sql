CREATE TABLE public.transaction_note_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  transaction_id uuid NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  field text NOT NULL,
  old_value text,
  new_value text,
  changed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX transaction_note_history_tx_idx
  ON public.transaction_note_history (transaction_id, changed_at DESC);

GRANT SELECT, INSERT ON public.transaction_note_history TO authenticated;
GRANT ALL ON public.transaction_note_history TO service_role;

ALTER TABLE public.transaction_note_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own note history"
  ON public.transaction_note_history FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own note history"
  ON public.transaction_note_history FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.log_transaction_note_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF COALESCE(NEW.notes, '') <> COALESCE(OLD.notes, '') THEN
    INSERT INTO public.transaction_note_history (user_id, transaction_id, field, old_value, new_value)
    VALUES (NEW.user_id, NEW.id, 'notes', OLD.notes, NEW.notes);
  END IF;
  IF COALESCE(NEW.description, '') <> COALESCE(OLD.description, '') THEN
    INSERT INTO public.transaction_note_history (user_id, transaction_id, field, old_value, new_value)
    VALUES (NEW.user_id, NEW.id, 'description', OLD.description, NEW.description);
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.log_transaction_note_change() FROM anon, authenticated, PUBLIC;

DROP TRIGGER IF EXISTS trg_log_transaction_note_change ON public.transactions;
CREATE TRIGGER trg_log_transaction_note_change
  AFTER UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.log_transaction_note_change();