DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT dup.id AS dup_id, keep.id AS keep_id
    FROM public.categories dup
    JOIN public.categories keep
      ON keep.user_id = dup.user_id AND keep.type = dup.type AND lower(keep.name) = 'água'
    WHERE lower(dup.name) IN ('água mineral', 'agua mineral')
  LOOP
    UPDATE public.transactions SET category_id = r.keep_id WHERE category_id = r.dup_id;
    UPDATE public.transactions SET sub_category_id = NULL WHERE sub_category_id = r.dup_id;
    UPDATE public.budgets SET category_id = r.keep_id WHERE category_id = r.dup_id;
    UPDATE public.recurring_rules SET category_id = r.keep_id WHERE category_id = r.dup_id;
    UPDATE public.commitments SET category_id = r.keep_id WHERE category_id = r.dup_id;
    UPDATE public.goals SET category_id = r.keep_id WHERE category_id = r.dup_id;
    UPDATE public.category_suggestions SET category_id = r.keep_id WHERE category_id = r.dup_id;
    UPDATE public.category_suggestion_feedback SET suggested_category_id = NULL WHERE suggested_category_id = r.dup_id;
    UPDATE public.category_suggestion_feedback SET corrected_category_id = NULL WHERE corrected_category_id = r.dup_id;
    UPDATE public.categories SET parent_id = r.keep_id WHERE parent_id = r.dup_id;
    DELETE FROM public.categories WHERE id = r.dup_id;
  END LOOP;
END $$;

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
      ('Corte de cabelo','scissors','#c026d3'),
      ('Educação','graduation-cap','#0891b2'),
      ('Material didático','book-open','#0284c7'),
      ('Mesada','piggy-bank','#f59e0b'),
      ('Pix para filhos','send','#fb923c'),
      ('Presentes e aniversários','cake','#db2777'),
      ('Lazer com filhos','ice-cream-cone','#f472b6'),
      ('Lazer','party-popper','#a855f7'),
      ('Assinaturas','repeat','#7c3aed'),
      ('Aplicativos e licenças','app-window','#7c3aed'),
      ('Mensalidades','calendar-clock','#2563eb'),
      ('Manutenção','wrench','#64748b'),
      ('Veículos','car','#475569'),
      ('Peças de carro','cog','#525252'),
      ('Manutenção de carro','wrench','#57534e'),
      ('Peças de moto','cog','#6b7280'),
      ('Manutenção de moto','wrench','#4b5563'),
      ('Peças de bicicleta','cog','#0f766e'),
      ('Manutenção de bicicleta','bike','#0d9488'),
      ('IPVA','landmark','#dc2626'),
      ('Licenciamento','file-check','#0ea5e9'),
      ('Seguro do veículo','shield','#1d4ed8'),
      ('Multas','triangle-alert','#f97316'),
      ('Impostos','landmark','#dc2626'),
      ('Imposto de Renda a pagar','landmark','#b91c1c'),
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
  FROM (VALUES
    ('Salário','wallet','#10b981'),
    ('Renda Extra','trending-up','#22d3ee'),
    ('Imposto de Renda a receber','landmark','#059669')
  ) AS v(name, icon, color)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.categories c
    WHERE c.user_id = _user_id AND c.name = v.name AND c.type = 'income'
  );
END;
$function$;