CREATE TABLE public.share_links (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  password_salt text NOT NULL,
  label text,
  year integer NOT NULL,
  month integer NOT NULL CHECK (month BETWEEN 1 AND 12),
  include_transactions boolean NOT NULL DEFAULT true,
  include_notes boolean NOT NULL DEFAULT false,
  expires_at timestamp with time zone,
  revoked_at timestamp with time zone,
  view_count integer NOT NULL DEFAULT 0,
  last_viewed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX share_links_user_idx ON public.share_links (user_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.share_links TO authenticated;
GRANT ALL ON public.share_links TO service_role;

ALTER TABLE public.share_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage their share links"
  ON public.share_links FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_share_links_updated_at
  BEFORE UPDATE ON public.share_links
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();