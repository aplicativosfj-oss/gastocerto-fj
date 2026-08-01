CREATE TABLE public.payment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid REFERENCES public.payments(id) ON DELETE CASCADE,
  license_id uuid REFERENCES public.licenses(id) ON DELETE SET NULL,
  external_id text,
  event_type text NOT NULL,
  status text,
  source text NOT NULL DEFAULT 'webhook',
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.payment_events TO authenticated;
GRANT ALL ON public.payment_events TO service_role;

ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view payment events"
ON public.payment_events FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'support'));

CREATE UNIQUE INDEX payment_events_license_release_once
ON public.payment_events (payment_id)
WHERE event_type = 'license_released';

CREATE INDEX payment_events_payment_idx ON public.payment_events (payment_id, created_at DESC);
CREATE INDEX payment_events_external_idx ON public.payment_events (external_id);