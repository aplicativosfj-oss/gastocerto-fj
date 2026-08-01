-- Use the proper ID based on auth.users for Denis Franc
INSERT INTO public.categories (user_id, name, type, icon, color, is_default, description)
SELECT id, 'Oficinas', 'expense', 'wrench', '#64748b', false, 'Reparos, peças e manutenção mecânica' FROM auth.users WHERE id IN (SELECT id FROM public.profiles WHERE full_name = 'Denis Franc')
ON CONFLICT (user_id, name) DO UPDATE SET description = EXCLUDED.description;

INSERT INTO public.categories (user_id, name, type, icon, color, is_default, description)
SELECT id, 'Lava-jato', 'expense', 'droplet', '#0ea5e9', false, 'Limpeza e estética automotiva' FROM auth.users WHERE id IN (SELECT id FROM public.profiles WHERE full_name = 'Denis Franc')
ON CONFLICT (user_id, name) DO UPDATE SET description = EXCLUDED.description;

INSERT INTO public.categories (user_id, name, type, icon, color, is_default, description)
SELECT id, 'Roçagem', 'expense', 'sprout', '#22c55e', false, 'Manutenção de terrenos e jardins' FROM auth.users WHERE id IN (SELECT id FROM public.profiles WHERE full_name = 'Denis Franc')
ON CONFLICT (user_id, name) DO UPDATE SET description = EXCLUDED.description;
