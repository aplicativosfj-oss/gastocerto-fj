CREATE OR REPLACE FUNCTION public.create_default_categories(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
      ('Mensalidades','calendar-clock','#2563eb'),
      ('Manutenção','wrench','#64748b'),
      ('Veículos','car','#475569'),
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
$$;

DO $$
DECLARE u record;
BEGIN
  FOR u IN SELECT DISTINCT user_id FROM public.profiles LOOP
    PERFORM public.create_default_categories(u.user_id);
  END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_default_categories(uuid) FROM PUBLIC, anon, authenticated;