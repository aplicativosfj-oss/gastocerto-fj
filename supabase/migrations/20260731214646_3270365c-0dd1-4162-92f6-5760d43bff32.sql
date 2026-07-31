
-- Permite subcategorias
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.categories(id) ON DELETE CASCADE;

-- Melhora o rastreamento das sugestões de categoria
CREATE TABLE IF NOT EXISTS public.category_suggestion_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    description TEXT NOT NULL,
    suggested_category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    accepted BOOLEAN NOT NULL,
    corrected_category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

GRANT SELECT, INSERT, UPDATE ON public.category_suggestion_feedback TO authenticated;
GRANT ALL ON public.category_suggestion_feedback TO service_role;

ALTER TABLE public.category_suggestion_feedback ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage their own feedback' AND tablename = 'category_suggestion_feedback') THEN
        CREATE POLICY "Users can manage their own feedback"
        ON public.category_suggestion_feedback
        FOR ALL
        TO authenticated
        USING (auth.uid() = user_id);
    END IF;
END $$;
