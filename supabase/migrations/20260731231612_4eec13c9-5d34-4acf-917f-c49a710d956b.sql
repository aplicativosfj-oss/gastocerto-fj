DROP POLICY IF EXISTS "closings_delete_own" ON public.monthly_closings;

CREATE POLICY "closings_delete_staff" ON public.monthly_closings
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'support'));