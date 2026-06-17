
-- ENUMS
CREATE TYPE public.app_role AS ENUM ('admin', 'user');
CREATE TYPE public.campaign_status AS ENUM ('pending', 'approved', 'rejected');

-- PROFILES
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- USER ROLES
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- CAMPAIGNS
CREATE TABLE public.campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  story TEXT NOT NULL,
  image_path TEXT,
  goal_amount NUMERIC(12,2) NOT NULL CHECK (goal_amount > 0),
  raised_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  pix_key TEXT NOT NULL,
  beneficiary_name TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  status public.campaign_status NOT NULL DEFAULT 'pending',
  featured BOOLEAN NOT NULL DEFAULT false,
  views INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_campaigns_status ON public.campaigns(status);
CREATE INDEX idx_campaigns_featured ON public.campaigns(featured);
CREATE INDEX idx_campaigns_user ON public.campaigns(user_id);
CREATE INDEX idx_campaigns_created ON public.campaigns(created_at DESC);

GRANT SELECT ON public.campaigns TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaigns TO authenticated;
GRANT ALL ON public.campaigns TO service_role;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View approved campaigns" ON public.campaigns FOR SELECT USING (status = 'approved');
CREATE POLICY "Owners view own campaigns" ON public.campaigns FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins view all campaigns" ON public.campaigns FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Auth users create campaigns" ON public.campaigns FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND status = 'pending');
CREATE POLICY "Owners update own campaigns" ON public.campaigns FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins update any campaign" ON public.campaigns FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Owners delete own campaigns" ON public.campaigns FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins delete any campaign" ON public.campaigns FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- COMMENTS
CREATE TABLE public.comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 1000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_comments_campaign ON public.comments(campaign_id);
GRANT SELECT ON public.comments TO anon;
GRANT SELECT, INSERT, DELETE ON public.comments TO authenticated;
GRANT ALL ON public.comments TO service_role;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone views comments" ON public.comments FOR SELECT USING (true);
CREATE POLICY "Auth users post comments" ON public.comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own comments" ON public.comments FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins delete any comment" ON public.comments FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- REPORTS
CREATE TABLE public.reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL CHECK (char_length(reason) BETWEEN 5 AND 1000),
  resolved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_reports_campaign ON public.reports(campaign_id);
GRANT SELECT, INSERT, UPDATE ON public.reports TO authenticated;
GRANT ALL ON public.reports TO service_role;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own reports" ON public.reports FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins view all reports" ON public.reports FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Auth users create reports" ON public.reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins update reports" ON public.reports FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- TRIGGERS
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON public.campaigns
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- STORAGE policies (bucket campaign-images already exists)
CREATE POLICY "Campaign images readable by all" ON storage.objects FOR SELECT USING (bucket_id = 'campaign-images');
CREATE POLICY "Users upload own campaign images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'campaign-images' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users update own campaign images" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'campaign-images' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users delete own campaign images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'campaign-images' AND (storage.foldername(name))[1] = auth.uid()::text);
