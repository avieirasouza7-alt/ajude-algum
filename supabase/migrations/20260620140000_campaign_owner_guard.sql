-- Impede que donos de campanha se auto-aprovem ou alterem moderação

CREATE OR REPLACE FUNCTION public.guard_campaign_owner_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  IF auth.uid() IS NULL OR auth.uid() <> OLD.user_id THEN
    RETURN NEW;
  END IF;

  NEW.featured := OLD.featured;
  NEW.hidden := OLD.hidden;
  NEW.rejection_reason := OLD.rejection_reason;
  NEW.views := OLD.views;

  IF OLD.status IS DISTINCT FROM NEW.status THEN
    IF OLD.status = 'approved' AND NEW.status = 'pending' THEN
      NULL;
    ELSE
      NEW.status := OLD.status;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_campaign_owner_update ON public.campaigns;
CREATE TRIGGER guard_campaign_owner_update
  BEFORE UPDATE ON public.campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_campaign_owner_update();

DROP POLICY IF EXISTS "View approved campaigns" ON public.campaigns;
CREATE POLICY "View approved campaigns" ON public.campaigns
  FOR SELECT
  USING (status = 'approved' AND COALESCE(hidden, false) = false);
