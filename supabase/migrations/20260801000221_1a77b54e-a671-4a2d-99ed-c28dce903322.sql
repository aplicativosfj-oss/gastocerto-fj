ALTER TABLE public.commitments
  ADD COLUMN IF NOT EXISTS installments_paid integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.commitments.installments_paid IS 'Quantas parcelas já foram pagas (para calcular quantas faltam).';
COMMENT ON COLUMN public.commitments.end_date IS 'Data final prevista do compromisso (última parcela).';