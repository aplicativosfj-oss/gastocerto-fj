ALTER TABLE public.share_links
  ADD COLUMN IF NOT EXISTS include_totals boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS include_charts boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS include_categories boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS include_amounts boolean NOT NULL DEFAULT true;