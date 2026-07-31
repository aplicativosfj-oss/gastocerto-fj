-- Primeiro adicionamos a restrição única para permitir o ON CONFLICT
ALTER TABLE public.categories ADD CONSTRAINT categories_user_id_name_key UNIQUE (user_id, name);

-- Agora inserimos as novas categorias para todos os usuários existentes
INSERT INTO public.categories (user_id, name, type, icon, color, is_default)
SELECT p.user_id, t.name, 'expense', t.icon, t.color, true
FROM public.profiles p,
(VALUES 
  ('Supermercado', 'shopping-cart', '#16a34a'),
  ('Açougue', 'utensils', '#ef4444'),
  ('Padaria', 'bread', '#f59e0b'),
  ('Frutaria', 'apple', '#10b981'),
  ('Academia', 'dumbbell', '#3b82f6'),
  ('Almoço', 'utensils', '#f97316'),
  ('Espetinhos', 'flame', '#ef4444'),
  ('Açaí', 'ice-cream', '#8b5cf6'),
  ('Farmácia', 'pill', '#ef4444'),
  ('Medicamentos', 'pill', '#f43f5e')
) AS t(name, icon, color)
ON CONFLICT (user_id, name) DO NOTHING;