-- 1) Campos de bloqueio no fechamento mensal
ALTER TABLE public.monthly_closings
  ADD COLUMN IF NOT EXISTS locked boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS reopened_until timestamptz,
  ADD COLUMN IF NOT EXISTS reopened_by uuid,
  ADD COLUMN IF NOT EXISTS reopen_note text;

-- Administradores e suporte podem liberar mês fechado
CREATE POLICY "closings_update_staff" ON public.monthly_closings
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'support'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'support'));

CREATE POLICY "closings_select_staff" ON public.monthly_closings
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'support'));

-- 2) Pedidos de reabertura
CREATE TABLE public.closing_reopen_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  year integer NOT NULL,
  month integer NOT NULL,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  decided_by uuid,
  decided_at timestamptz,
  reopen_until timestamptz,
  admin_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.closing_reopen_requests TO authenticated;
GRANT ALL ON public.closing_reopen_requests TO service_role;

ALTER TABLE public.closing_reopen_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reopen_select_own" ON public.closing_reopen_requests
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "reopen_insert_own" ON public.closing_reopen_requests
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "reopen_select_staff" ON public.closing_reopen_requests
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'support'));

CREATE POLICY "reopen_update_staff" ON public.closing_reopen_requests
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'support'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'support'));

CREATE TRIGGER update_reopen_requests_updated_at
  BEFORE UPDATE ON public.closing_reopen_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_reopen_requests_user ON public.closing_reopen_requests (user_id, year, month);
CREATE INDEX idx_reopen_requests_status ON public.closing_reopen_requests (status);

-- 3) Limpeza dos lançamentos indevidos anteriores a julho/2026
DELETE FROM public.transactions WHERE transaction_date < DATE '2026-07-01';

-- 4) Integridade: nada antes de julho/2026 e nada em mês fechado sem liberação
CREATE OR REPLACE FUNCTION public.enforce_transaction_period()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_date date;
  target_user uuid;
  closing record;
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
$$;

CREATE TRIGGER enforce_transaction_period_trg
  BEFORE INSERT OR UPDATE OR DELETE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.enforce_transaction_period();

-- 5) Novas categorias de despesa para todos os clientes
INSERT INTO public.categories (user_id, name, type, icon, color, is_default)
SELECT p.user_id, v.name, 'expense', v.icon, v.color, true
FROM public.profiles p
CROSS JOIN (VALUES
  ('IPVA','landmark','#dc2626'),
  ('Licenciamento','file-check','#0ea5e9'),
  ('Seguro do veículo','shield','#1d4ed8'),
  ('Multas','triangle-alert','#f97316'),
  ('Aplicativos e licenças','app-window','#7c3aed')
) AS v(name, icon, color)
WHERE NOT EXISTS (
  SELECT 1 FROM public.categories c
  WHERE c.user_id = p.user_id AND c.name = v.name AND c.type = 'expense'
);

-- 6) Mesmas categorias para novos cadastros
CREATE OR REPLACE FUNCTION public.create_default_categories(_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  item record;
BEGIN
  FOR item IN
    SELECT * FROM (VALUES
      ('Alimentação','utensils','#f97316'),
      ('Feira','carrot','#22c55e'),
      ('Supermercado','shopping-cart','#16a34a'),
      ('Restaurantes','chef-hat','#fb7185'),
      ('Delivery','bike','#f43f5e'),
      ('Água Mineral','cup-soda','#38bdf8'),
      ('Combustível','fuel','#ef4444'),
      ('Gás','flame','#f59e0b'),
      ('Moradia','home','#3b82f6'),
      ('Água','droplet','#0ea5e9'),
      ('Energia','zap','#eab308'),
      ('Internet','wifi','#6366f1'),
      ('Telefone','phone','#8b5cf6'),
      ('Transporte','bus','#14b8a6'),
      ('Saúde','heart-pulse','#ec4899'),
      ('Medicamentos','pill','#f43f5e'),
      ('Academia','dumbbell','#84cc16'),
      ('Streaming','monitor-play','#a21caf'),
      ('Roupas','shirt','#0d9488'),
      ('Beleza','scissors','#e879f9'),
      ('Educação','graduation-cap','#0891b2'),
      ('Lazer','party-popper','#a855f7'),
      ('Assinaturas','repeat','#7c3aed'),
      ('Aplicativos e licenças','app-window','#7c3aed'),
      ('Mensalidades','calendar-clock','#2563eb'),
      ('Manutenção','wrench','#64748b'),
      ('Veículos','car','#475569'),
      ('IPVA','landmark','#dc2626'),
      ('Licenciamento','file-check','#0ea5e9'),
      ('Seguro do veículo','shield','#1d4ed8'),
      ('Multas','triangle-alert','#f97316'),
      ('Impostos','landmark','#dc2626'),
      ('Seguros','shield','#1d4ed8'),
      ('Filhos','baby','#fb923c'),
      ('Presentes','gift','#db2777'),
      ('Doações','hand-heart','#10b981'),
      ('Pets','paw-print','#d97706'),
      ('Viagens','plane','#059669'),
      ('Outros','circle-ellipsis','#94a3b8')
    ) AS t(name, icon, color)
  LOOP
    INSERT INTO public.categories (user_id, name, type, icon, color, is_default)
    SELECT _user_id, item.name, 'expense', item.icon, item.color, true
    WHERE NOT EXISTS (
      SELECT 1 FROM public.categories c
      WHERE c.user_id = _user_id AND c.name = item.name AND c.type = 'expense'
    );
  END LOOP;

  INSERT INTO public.categories (user_id, name, type, icon, color, is_default)
  SELECT _user_id, v.name, 'income', v.icon, v.color, true
  FROM (VALUES ('Salário','wallet','#10b981'), ('Renda Extra','trending-up','#22d3ee')) AS v(name, icon, color)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.categories c
    WHERE c.user_id = _user_id AND c.name = v.name AND c.type = 'income'
  );
END;
$function$;