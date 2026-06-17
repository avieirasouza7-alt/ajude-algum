-- Admin panel: user moderation, audit, settings, notifications

DO $$
BEGIN
  ALTER TYPE public.campaign_status ADD VALUE IF NOT EXISTS 'correction_requested';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TYPE public.campaign_status ADD VALUE IF NOT EXISTS 'archived';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS account_status TEXT NOT NULL DEFAULT 'active';

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_account_status_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_account_status_check CHECK (
    account_status IN ('active', 'suspended', 'blocked', 'banned')
  );

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status_reason TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;

ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS admin_notes TEXT;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS hidden BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS admin_action TEXT;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS admin_notes TEXT;

CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_created ON public.admin_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_admin ON public.admin_audit_logs(admin_id);

CREATE TABLE IF NOT EXISTS public.site_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_notifications_read ON public.admin_notifications(read, created_at DESC);

GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT SELECT, INSERT ON public.admin_audit_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.site_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.admin_notifications TO authenticated;
GRANT ALL ON public.admin_audit_logs TO service_role;
GRANT ALL ON public.site_settings TO service_role;
GRANT ALL ON public.admin_notifications TO service_role;

ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins view all profiles" ON public.profiles;
CREATE POLICY "Admins view all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin') OR auth.uid() = id);

DROP POLICY IF EXISTS "Admins update any profile" ON public.profiles;
CREATE POLICY "Admins update any profile" ON public.profiles
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins view all roles" ON public.user_roles;
CREATE POLICY "Admins view all roles" ON public.user_roles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin') OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins insert roles" ON public.user_roles;
CREATE POLICY "Admins insert roles" ON public.user_roles
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins delete roles" ON public.user_roles;
CREATE POLICY "Admins delete roles" ON public.user_roles
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins read audit logs" ON public.admin_audit_logs;
CREATE POLICY "Admins read audit logs" ON public.admin_audit_logs
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins insert audit logs" ON public.admin_audit_logs;
CREATE POLICY "Admins insert audit logs" ON public.admin_audit_logs
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') AND auth.uid() = admin_id);

DROP POLICY IF EXISTS "Admins manage site settings" ON public.site_settings;
CREATE POLICY "Admins manage site settings" ON public.site_settings
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins manage notifications" ON public.admin_notifications;
CREATE POLICY "Admins manage notifications" ON public.admin_notifications
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Public read site settings" ON public.site_settings;
CREATE POLICY "Public read site settings" ON public.site_settings
  FOR SELECT USING (true);

CREATE OR REPLACE FUNCTION public.admin_dashboard_stats()
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT json_build_object(
    'total_users', (SELECT count(*)::int FROM public.profiles),
    'active_users', (SELECT count(*)::int FROM public.profiles WHERE account_status = 'active'),
    'new_users_7d', (SELECT count(*)::int FROM public.profiles WHERE created_at >= now() - interval '7 days'),
    'total_campaigns', (SELECT count(*)::int FROM public.campaigns),
    'approved_campaigns', (SELECT count(*)::int FROM public.campaigns WHERE status = 'approved'),
    'pending_campaigns', (SELECT count(*)::int FROM public.campaigns WHERE status = 'pending'),
    'rejected_campaigns', (SELECT count(*)::int FROM public.campaigns WHERE status = 'rejected'),
    'correction_campaigns', (SELECT count(*)::int FROM public.campaigns WHERE status = 'correction_requested'),
    'archived_campaigns', (SELECT count(*)::int FROM public.campaigns WHERE status = 'archived'),
    'total_reports', (SELECT count(*)::int FROM public.reports),
    'open_reports', (SELECT count(*)::int FROM public.reports WHERE resolved = false),
    'total_comments', (SELECT count(*)::int FROM public.comments)
  ) INTO result;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_dashboard_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_dashboard_stats() TO authenticated;

CREATE OR REPLACE FUNCTION public.notify_admin_new_campaign()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.admin_notifications (type, title, body, link)
  VALUES ('campaign', 'Nova campanha aguardando análise', NEW.title, '/admin/campanhas');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_admin_new_report()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.admin_notifications (type, title, body, link)
  VALUES ('report', 'Nova denúncia recebida', left(NEW.reason, 120), '/admin/denuncias');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_admin_campaign ON public.campaigns;
CREATE TRIGGER trg_notify_admin_campaign
AFTER INSERT ON public.campaigns
FOR EACH ROW
WHEN (NEW.status = 'pending')
EXECUTE FUNCTION public.notify_admin_new_campaign();

DROP TRIGGER IF EXISTS trg_notify_admin_report ON public.reports;
CREATE TRIGGER trg_notify_admin_report
AFTER INSERT ON public.reports
FOR EACH ROW
EXECUTE FUNCTION public.notify_admin_new_report();
