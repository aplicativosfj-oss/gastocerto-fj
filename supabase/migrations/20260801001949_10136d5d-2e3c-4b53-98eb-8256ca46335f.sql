REVOKE EXECUTE ON FUNCTION public.create_default_categories(uuid) FROM authenticated, anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_default_categories(uuid) TO service_role;