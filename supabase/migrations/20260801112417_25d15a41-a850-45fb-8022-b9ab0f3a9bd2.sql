UPDATE public.plans SET monthly_price = 24.90, annual_price = 249.00,
  features = to_jsonb(ARRAY['Lançamentos ilimitados','Até 2 veículos, 5 metas e 2 links compartilhados','Histórico de 24 meses','Combustível, gás e orçamentos','Exportação CSV e PDF'])
WHERE slug = 'premium';

UPDATE public.plans SET monthly_price = 34.90, annual_price = 349.00,
  features = to_jsonb(ARRAY['Tudo do Premium, sem cotas','Veículos, metas, links e histórico ilimitados','Consultor de IA com créditos mensais','Recibos e auditoria da IA'])
WHERE slug = 'premium_ia';