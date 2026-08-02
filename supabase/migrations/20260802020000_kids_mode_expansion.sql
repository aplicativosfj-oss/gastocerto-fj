-- Expansão do Espaço Kids: PIN, Metas, Saldo e Configurações
ALTER TABLE public.dependents 
ADD COLUMN IF NOT EXISTS pin_code TEXT,
ADD COLUMN IF NOT EXISTS kids_mode_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS monthly_limit DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS recurring_allowance_day INTEGER;

-- Tabela de Metas de Poupança para Crianças
CREATE TABLE IF NOT EXISTS public.kids_savings_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dependent_id UUID REFERENCES public.dependents(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    target_amount DECIMAL(12,2) NOT NULL,
    current_amount DECIMAL(12,2) DEFAULT 0,
    icon TEXT,
    reward TEXT,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Permissões
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kids_savings_goals TO authenticated;
GRANT ALL ON public.kids_savings_goals TO service_role;

-- RLS
ALTER TABLE public.kids_savings_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage savings goals for their dependents"
ON public.kids_savings_goals
FOR ALL
TO authenticated
USING (auth.uid() = user_id);

-- Log de Auditoria
COMMENT ON TABLE public.kids_savings_goals IS 'Metas de poupança lúdicas para crianças no Espaço Kids';
