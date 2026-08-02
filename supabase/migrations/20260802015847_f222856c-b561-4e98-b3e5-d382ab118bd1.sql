ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS kids_achievement_alerts boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS kids_email_alerts boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.kids_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dependent_id uuid,
  action text NOT NULL,
  title text NOT NULL,
  description text,
  amount numeric,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  dedupe_key text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS kids_audit_log_dedupe_idx
  ON public.kids_audit_log (user_id, dedupe_key) WHERE dedupe_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS kids_audit_log_user_created_idx
  ON public.kids_audit_log (user_id, created_at DESC);

GRANT SELECT, INSERT, DELETE ON public.kids_audit_log TO authenticated;
GRANT ALL ON public.kids_audit_log TO service_role;

ALTER TABLE public.kids_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own kids audit" ON public.kids_audit_log
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own kids audit" ON public.kids_audit_log
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own kids audit" ON public.kids_audit_log
  FOR DELETE TO authenticated USING (auth.uid() = user_id);