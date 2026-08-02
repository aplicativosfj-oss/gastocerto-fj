ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER TABLE public.kids_audit_log REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.kids_audit_log;

INSERT INTO public.app_settings (key, value)
VALUES ('email_rollout', '{"domainReady": false, "testSentAt": null, "enabledForAll": false, "note": null}'::jsonb)
ON CONFLICT (key) DO NOTHING;