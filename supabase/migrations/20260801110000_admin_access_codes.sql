-- Tabela para gerenciar códigos de acesso administrativo
CREATE TABLE public.admin_access_codes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code text UNIQUE NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    expires_at timestamptz NOT NULL,
    revoked_at timestamptz,
    created_by uuid REFERENCES auth.users(id),
    usage_count int DEFAULT 0 NOT NULL,
    max_uses int DEFAULT 1 NOT NULL,
    label text
);

-- Tabela para log de uso dos códigos
CREATE TABLE public.admin_access_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code_id uuid REFERENCES public.admin_access_codes(id) ON DELETE CASCADE NOT NULL,
    used_at timestamptz DEFAULT now() NOT NULL,
    ip_address text,
    user_agent text,
    success boolean DEFAULT true NOT NULL
);

-- Grants
GRANT SELECT, INSERT, UPDATE ON public.admin_access_codes TO authenticated;
GRANT ALL ON public.admin_access_codes TO service_role;
GRANT SELECT, INSERT ON public.admin_access_logs TO authenticated;
GRANT ALL ON public.admin_access_logs TO service_role;

-- RLS
ALTER TABLE public.admin_access_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_access_logs ENABLE ROW LEVEL SECURITY;

-- Apenas admins podem ver e gerenciar códigos
CREATE POLICY "Admins can manage access codes"
ON public.admin_access_codes
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view access logs"
ON public.admin_access_logs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Criar um código mestre inicial (se não existir)
INSERT INTO public.admin_access_codes (code, expires_at, max_uses, label)
VALUES ('ADMIN123456', now() + interval '1 year', 99999, 'Código Mestre Inicial')
ON CONFLICT (code) DO NOTHING;
