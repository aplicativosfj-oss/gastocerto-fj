-- Adicionando novas categorias para crianças (renda)
CREATE OR REPLACE FUNCTION public.create_default_categories(_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  item record;
  catalog jsonb;
BEGIN
  SELECT value INTO catalog FROM public.app_settings WHERE key = 'category_catalog';

  IF catalog IS NOT NULL AND jsonb_typeof(catalog) = 'array' THEN
    FOR item IN
      SELECT
        (e ->> 'name') AS name,
        COALESCE(e ->> 'type', 'expense') AS type,
        COALESCE(e ->> 'icon', 'circle-ellipsis') AS icon,
        COALESCE(e ->> 'color', '#94a3b8') AS color
      FROM jsonb_array_elements(catalog) AS e
    LOOP
      IF item.name IS NULL OR length(btrim(item.name)) = 0 THEN
        CONTINUE;
      END IF;
      INSERT INTO public.categories (user_id, name, type, icon, color, is_default)
      SELECT _user_id, item.name, item.type::category_type, item.icon, item.color, true
      WHERE NOT EXISTS (
        SELECT 1 FROM public.categories c
        WHERE c.user_id = _user_id AND lower(c.name) = lower(item.name) AND c.type = item.type::category_type
      );
    END LOOP;
    RETURN;
  END IF;

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
      ('Luz','zap','#eab308'),
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
      ('Material didático','book-open','#0284c7'),
      ('Mesada','piggy-bank','#f59e0b'),
      ('Pix para filhos','send','#fb923c'),
      ('Lazer com filhos','ice-cream-cone','#f472b6'),
      ('Lazer','party-popper','#a855f7'),
      ('Assinaturas','repeat','#7c3aed'),
      ('Aplicativos e licenças','app-window','#7c3aed'),
      ('Mensalidades','calendar-clock','#2563eb'),
      ('Consignado','landmark','#1d4ed8'),
      ('Financiamentos','building-2','#1e40af'),
      ('Boletos','file-check','#0f766e'),
      ('Crediário','credit-card','#9333ea'),
      ('Consórcio','handshake','#0369a1'),
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
      ('Gastos da Criança','toy-brick','#f472b6'),
      ('Outros','circle-ellipsis','#94a3b8')
    ) AS t(name, icon, color)
  LOOP
    INSERT INTO public.categories (user_id, name, type, icon, color, is_default)
    SELECT _user_id, item.name, 'expense', item.icon, item.color, true
    WHERE NOT EXISTS (
      SELECT 1 FROM public.categories c
      WHERE c.user_id = _user_id AND lower(c.name) = lower(item.name) AND c.type = 'expense'
    );
  END LOOP;

  INSERT INTO public.categories (user_id, name, type, icon, color, is_default)
  SELECT _user_id, v.name, 'income', v.icon, v.color, true
  FROM (VALUES
    ('Salário','wallet','#10b981'),
    ('Renda Extra','trending-up','#22d3ee'),
    ('Imposto de Renda a receber','landmark','#059669'),
    ('Mesada dos pais','piggy-bank','#f59e0b'),
    ('Presentes em dinheiro','gift','#db2777'),
    ('Brindes e prêmios','trophy','#eab308'),
    ('Venda de brinquedos','rocket','#06b6d4')
  ) AS v(name, icon, color)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.categories c
    WHERE c.user_id = _user_id AND lower(c.name) = lower(v.name) AND c.type = 'income'
  );
END;
$function$;
