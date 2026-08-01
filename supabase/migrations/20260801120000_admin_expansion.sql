-- 1. Suporte e Chamados
CREATE TABLE public.support_tickets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    subject text NOT NULL,
    message text NOT NULL,
    status text NOT NULL DEFAULT 'open',
    priority text NOT NULL DEFAULT 'normal',
    admin_notes text,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

GRANT SELECT, INSERT, UPDATE ON public.support_tickets TO authenticated;
GRANT ALL ON public.support_tickets TO service_role;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see and create their own tickets" ON public.support_tickets
    FOR ALL TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all tickets" ON public.support_tickets
    FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 2. Avisos Globais
CREATE TABLE public.global_announcements (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    content text NOT NULL,
    type text NOT NULL DEFAULT 'info',
    active boolean DEFAULT true,
    expires_at timestamptz,
    created_by uuid REFERENCES auth.users(id),
    created_at timestamptz DEFAULT now() NOT NULL
);

GRANT SELECT ON public.global_announcements TO authenticated;
GRANT ALL ON public.global_announcements TO service_role;
ALTER TABLE public.global_announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can see active announcements" ON public.global_announcements
    FOR SELECT TO authenticated USING (active = true AND (expires_at IS NULL OR expires_at > now()));

CREATE POLICY "Admins manage announcements" ON public.global_announcements
    FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 3. Configurações de Planos (Dinâmico)
CREATE TABLE public.plan_configs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    slug text UNIQUE NOT NULL,
    name text NOT NULL,
    monthly_price numeric(10,2) NOT NULL,
    annual_price numeric(10,2) NOT NULL,
    features jsonb NOT NULL DEFAULT '{}',
    limits jsonb NOT NULL DEFAULT '{}',
    active boolean DEFAULT true,
    updated_at timestamptz DEFAULT now() NOT NULL
);

GRANT SELECT ON public.plan_configs TO authenticated;
GRANT ALL ON public.plan_configs TO service_role;
ALTER TABLE public.plan_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can see active plans" ON public.plan_configs
    FOR SELECT TO authenticated USING (active = true);

CREATE POLICY "Admins manage plans" ON public.plan_configs
    FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 4. Métricas de Negócio
CREATE TABLE public.business_metrics_daily (
    date date PRIMARY KEY DEFAULT current_date,
    mrr numeric(15,2) DEFAULT 0,
    new_subscriptions int DEFAULT 0,
    churned_subscriptions int DEFAULT 0,
    total_active_subscribers int DEFAULT 0,
    ai_cost_estimated numeric(15,4) DEFAULT 0,
    revenue_gross numeric(15,2) DEFAULT 0
);

GRANT SELECT ON public.business_metrics_daily TO authenticated;
GRANT ALL ON public.business_metrics_daily TO service_role;
ALTER TABLE public.business_metrics_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins see metrics" ON public.business_metrics_daily
    FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
