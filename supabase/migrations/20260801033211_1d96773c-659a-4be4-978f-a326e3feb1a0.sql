CREATE OR REPLACE FUNCTION public.enforce_transaction_period()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  target_date date;
  target_user uuid;
  closing record;
  policy jsonb;
  lock_past boolean := false;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_date := OLD.transaction_date;
    target_user := OLD.user_id;
  ELSE
    target_date := NEW.transaction_date;
    target_user := NEW.user_id;
    IF target_date < DATE '2026-07-01' THEN
      RAISE EXCEPTION 'Só é possível registrar lançamentos a partir de julho de 2026.';
    END IF;
  END IF;

  SELECT value INTO policy FROM public.app_settings WHERE key = 'closing_policy';
  IF policy IS NOT NULL THEN
    lock_past := COALESCE((policy ->> 'lockPastMonths')::boolean, false);
  END IF;

  IF lock_past
     AND date_trunc('month', target_date) < date_trunc('month', (now() AT TIME ZONE 'America/Sao_Paulo')::date)
     AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'O administrador bloqueou alterações em meses anteriores. Solicite a liberação para retificar %.',
      to_char(target_date, 'MM/YYYY');
  END IF;

  SELECT * INTO closing
  FROM public.monthly_closings
  WHERE user_id = target_user
    AND year = EXTRACT(YEAR FROM target_date)::int
    AND month = EXTRACT(MONTH FROM target_date)::int;

  IF closing.id IS NOT NULL AND closing.locked
     AND (closing.reopened_until IS NULL OR closing.reopened_until < now()) THEN
    RAISE EXCEPTION 'O mês % está fechado. Solicite a liberação ao administrador.',
      to_char(target_date, 'MM/YYYY');
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$function$;