-- Permitir categorias em receitas
ALTER TABLE public.categories DROP CONSTRAINT IF EXISTS categories_type_check;
-- (O enum category_type já tem 'income', então só precisamos garantir que a restrição de check não exista ou aceite ambos)

-- Adicionar ordem de exibição para categorias
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS display_order integer DEFAULT 0;

-- Criar tabela para sugestões de categorias aprendidas pelo sistema
CREATE TABLE IF NOT EXISTS public.category_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  description_pattern text NOT NULL,
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  type public.transaction_type NOT NULL,
  usage_count integer DEFAULT 1,
  last_used_at timestamptz DEFAULT now(),
  UNIQUE(user_id, description_pattern, type)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.category_suggestions TO authenticated;
GRANT ALL ON public.category_suggestions TO service_role;
ALTER TABLE public.category_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "suggestions_select_own" ON public.category_suggestions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "suggestions_insert_own" ON public.category_suggestions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "suggestions_update_own" ON public.category_suggestions FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Inserir categorias de receita padrão para quem não tem
INSERT INTO public.categories (user_id, name, type, icon, color, is_default)
SELECT p.user_id, t.name, 'income', t.icon, t.color, true
FROM public.profiles p,
(VALUES 
  ('Salário', 'wallet', '#10b981'),
  ('Vendas', 'shopping-cart', '#3b82f6'),
  ('Serviços', 'wrench', '#f59e0b'),
  ('Renda Extra', 'trending-up', '#22d3ee'),
  ('Investimentos', 'landmark', '#8b5cf6'),
  ('Presentes', 'gift', '#ec4899')
) AS t(name, icon, color)
ON CONFLICT (user_id, name) DO NOTHING;