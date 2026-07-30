-- ENUMS
CREATE TYPE public.app_role AS ENUM ('user', 'admin', 'support');
CREATE TYPE public.category_type AS ENUM ('expense', 'income');
CREATE TYPE public.transaction_type AS ENUM ('expense', 'income', 'transfer');
CREATE TYPE public.transaction_status AS ENUM ('pending', 'paid', 'received', 'canceled', 'overdue');

-- UTIL
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- PLANS
CREATE TABLE public.plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  monthly_price numeric(12,2) NOT NULL DEFAULT 0,
  annual_price numeric(12,2) NOT NULL DEFAULT 0,
  transaction_limit integer,
  vehicle_limit integer,
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.plans TO anon;
GRANT SELECT ON public.plans TO authenticated;
GRANT ALL ON public.plans TO service_role;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

-- PROFILES
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  phone text,
  avatar_url text,
  monthly_income numeric(14,2),
  preferred_currency text NOT NULL DEFAULT 'BRL',
  onboarding_completed boolean NOT NULL DEFAULT false,
  plan_id uuid REFERENCES public.plans(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'active',
  terms_accepted_at timestamptz,
  privacy_accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- USER ROLES
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'user',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  );
$$;

-- CATEGORIES
CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  type public.category_type NOT NULL DEFAULT 'expense',
  parent_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  icon text,
  color text,
  is_default boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX categories_user_idx ON public.categories(user_id);

-- ACCOUNTS
CREATE TABLE public.accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  account_type text NOT NULL DEFAULT 'checking',
  institution text,
  initial_balance numeric(14,2) NOT NULL DEFAULT 0,
  current_balance numeric(14,2) NOT NULL DEFAULT 0,
  icon text,
  color text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.accounts TO authenticated;
GRANT ALL ON public.accounts TO service_role;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER accounts_updated_at BEFORE UPDATE ON public.accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX accounts_user_idx ON public.accounts(user_id);

-- TRANSACTIONS
CREATE TABLE public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL,
  credit_card_id uuid,
  description text NOT NULL,
  amount numeric(14,2) NOT NULL,
  transaction_type public.transaction_type NOT NULL DEFAULT 'expense',
  expense_type text,
  payment_method text,
  transaction_date date NOT NULL DEFAULT CURRENT_DATE,
  transaction_time time,
  due_date date,
  payment_date date,
  status public.transaction_status NOT NULL DEFAULT 'paid',
  merchant_name text,
  notes text,
  tags text[] NOT NULL DEFAULT '{}',
  attachment_url text,
  is_essential boolean NOT NULL DEFAULT false,
  is_recurring boolean NOT NULL DEFAULT false,
  recurring_rule_id uuid,
  installment_number integer,
  total_installments integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT transactions_amount_positive CHECK (amount >= 0),
  CONSTRAINT transactions_description_len CHECK (char_length(description) BETWEEN 1 AND 200)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transactions TO authenticated;
GRANT ALL ON public.transactions TO service_role;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER transactions_updated_at BEFORE UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX transactions_user_date_idx ON public.transactions(user_id, transaction_date DESC);

-- ONBOARDING PREFERENCES
CREATE TABLE public.onboarding_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  monthly_income numeric(14,2),
  payday integer,
  spending_limit numeric(14,2),
  main_goal text,
  used_categories text[] NOT NULL DEFAULT '{}',
  has_vehicle boolean NOT NULL DEFAULT false,
  track_fuel boolean NOT NULL DEFAULT false,
  track_gas_cylinder boolean NOT NULL DEFAULT false,
  track_subscriptions boolean NOT NULL DEFAULT false,
  wants_alerts boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT onboarding_payday_range CHECK (payday IS NULL OR (payday BETWEEN 1 AND 31))
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.onboarding_preferences TO authenticated;
GRANT ALL ON public.onboarding_preferences TO service_role;
ALTER TABLE public.onboarding_preferences ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER onboarding_preferences_updated_at BEFORE UPDATE ON public.onboarding_preferences FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- POLICIES: plans
CREATE POLICY "plans_select_all" ON public.plans FOR SELECT TO anon, authenticated USING (active = true);
CREATE POLICY "plans_admin_insert" ON public.plans FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "plans_admin_update" ON public.plans FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "plans_admin_delete" ON public.plans FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- POLICIES: profiles
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'support'));
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "profiles_delete_own" ON public.profiles FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- POLICIES: user_roles
CREATE POLICY "user_roles_select_own" ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- POLICIES: categories
CREATE POLICY "categories_select_own" ON public.categories FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "categories_insert_own" ON public.categories FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "categories_update_own" ON public.categories FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "categories_delete_own" ON public.categories FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- POLICIES: accounts
CREATE POLICY "accounts_select_own" ON public.accounts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "accounts_insert_own" ON public.accounts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "accounts_update_own" ON public.accounts FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "accounts_delete_own" ON public.accounts FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- POLICIES: transactions
CREATE POLICY "transactions_select_own" ON public.transactions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "transactions_insert_own" ON public.transactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "transactions_update_own" ON public.transactions FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "transactions_delete_own" ON public.transactions FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- POLICIES: onboarding_preferences
CREATE POLICY "onboarding_select_own" ON public.onboarding_preferences FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "onboarding_insert_own" ON public.onboarding_preferences FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "onboarding_update_own" ON public.onboarding_preferences FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "onboarding_delete_own" ON public.onboarding_preferences FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- DEFAULT CATEGORIES SEEDER
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
      ('Educação','graduation-cap','#0891b2'),
      ('Lazer','party-popper','#a855f7'),
      ('Assinaturas','repeat','#7c3aed'),
      ('Mensalidades','calendar-clock','#2563eb'),
      ('Manutenção','wrench','#64748b'),
      ('Veículos','car','#475569'),
      ('Impostos','landmark','#dc2626'),
      ('Pets','paw-print','#d97706'),
      ('Viagens','plane','#059669'),
      ('Outros','circle-ellipsis','#94a3b8')
    ) AS t(name, icon, color)
  LOOP
    INSERT INTO public.categories (user_id, name, type, icon, color, is_default)
    VALUES (_user_id, item.name, 'expense', item.icon, item.color, true)
    ON CONFLICT DO NOTHING;
  END LOOP;

  INSERT INTO public.categories (user_id, name, type, icon, color, is_default)
  VALUES
    (_user_id, 'Salário', 'income', 'wallet', '#10b981', true),
    (_user_id, 'Renda Extra', 'income', 'trending-up', '#22d3ee', true)
  ON CONFLICT DO NOTHING;
END;
$$;

-- NEW USER TRIGGER
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, plan_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', split_part(NEW.email, '@', 1)),
    (SELECT id FROM public.plans WHERE slug = 'free' LIMIT 1)
  )
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT DO NOTHING;

  PERFORM public.create_default_categories(NEW.id);

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- SEED PLANS
INSERT INTO public.plans (name, slug, description, monthly_price, annual_price, transaction_limit, vehicle_limit, features, active) VALUES
('Gratuito','free','Ideal para começar a organizar seus gastos.',0,0,100,1,'["Lançamentos manuais","Categorias personalizadas","Relatório mensal básico"]'::jsonb,true),
('Premium','premium','Controle completo, sem limites.',19.90,199.00,NULL,NULL,'["Lançamentos ilimitados","Controle de combustível","Controle de botijão de gás","Relatórios avançados","Alertas inteligentes","Exportação de dados"]'::jsonb,true);

-- STORAGE POLICIES FOR AVATARS
CREATE POLICY "avatars_read" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "avatars_insert_own" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "avatars_update_own" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "avatars_delete_own" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);