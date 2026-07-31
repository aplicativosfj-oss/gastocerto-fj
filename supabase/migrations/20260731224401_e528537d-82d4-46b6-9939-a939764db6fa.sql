ALTER TABLE public.transactions ADD COLUMN sub_category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transactions TO authenticated;
GRANT ALL ON public.transactions TO service_role;
