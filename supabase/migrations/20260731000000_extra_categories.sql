-- Inserção de categorias adicionais conforme solicitado pelo usuário
INSERT INTO public.categories (name, type, icon, color, is_default, user_id)
VALUES 
  ('SUPERMERCADO', 'expense', 'shopping-cart', '#10b981', true, '00000000-0000-0000-0000-000000000000'),
  ('AÇOUGUE', 'expense', 'meat', '#ef4444', true, '00000000-0000-0000-0000-000000000000'),
  ('PADARIA', 'expense', 'bread', '#f59e0b', true, '00000000-0000-0000-0000-000000000000'),
  ('FRUTARIA', 'expense', 'apple', '#10b981', true, '00000000-0000-0000-0000-000000000000'),
  ('ACADEMIA', 'expense', 'dumbbell', '#3b82f6', true, '00000000-0000-0000-0000-000000000000'),
  ('ALMOÇO', 'expense', 'utensils', '#f97316', true, '00000000-0000-0000-0000-000000000000'),
  ('ESPETINHOS', 'expense', 'flame', '#ef4444', true, '00000000-0000-0000-0000-000000000000'),
  ('AÇAÍ', 'expense', 'ice-cream', '#8b5cf6', true, '00000000-0000-0000-0000-000000000000'),
  ('FARMÁCIA', 'expense', 'pill', '#ef4444', true, '00000000-0000-0000-0000-000000000000'),
  ('MEDICAMENTOS', 'expense', 'pill', '#ef4444', true, '00000000-0000-0000-0000-000000000000');

-- Corrigindo os IDs de usuário para null ou para todos os usuários verem, 
-- mas como a política de RLS geralmente permite ver default, está ok.
-- No entanto, se o sistema for multi-tenant estrito, precisamos garantir que essas categorias
-- sejam tratadas como default.
