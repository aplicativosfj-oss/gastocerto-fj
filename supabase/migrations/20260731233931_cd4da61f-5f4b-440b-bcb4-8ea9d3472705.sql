CREATE TABLE public.ai_usage_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  feature text NOT NULL DEFAULT 'advisor',
  action text NOT NULL,
  allowed boolean NOT NULL DEFAULT false,
  reason text,
  plan_slug text,
  model text,
  input_tokens integer NOT NULL DEFAULT 0,
  output_tokens integer NOT NULL DEFAULT 0,
  total_tokens integer NOT NULL DEFAULT 0,
  credits numeric NOT NULL DEFAULT 0,
  question text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.ai_usage_log TO authenticated;
GRANT ALL ON public.ai_usage_log TO service_role;

ALTER TABLE public.ai_usage_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own ai usage" ON public.ai_usage_log
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all ai usage" ON public.ai_usage_log
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can insert own ai usage" ON public.ai_usage_log
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE INDEX ai_usage_log_user_created_idx ON public.ai_usage_log (user_id, created_at DESC);