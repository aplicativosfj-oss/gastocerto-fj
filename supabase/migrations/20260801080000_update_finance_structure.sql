-- Migration: Separate category display and add search filters
-- Date: 2026-08-01

-- 1. Ensure categories table has a description field if not present
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'categories' AND column_name = 'description') THEN
        ALTER TABLE public.categories ADD COLUMN description text;
    END IF;
END
$$;

-- 2. Update existing transactions to ensure description field is for "Transaction Description"
-- and category description comes from the category table.
-- (This is mostly a frontend change in how data is displayed).

-- 3. Add search indexes for better mobile performance if needed
CREATE INDEX IF NOT EXISTS idx_transactions_category_id ON public.transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_categories_user_type ON public.categories(user_id, type);

-- 4. Grant access (already done in base migration but good practice)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transactions TO authenticated;
