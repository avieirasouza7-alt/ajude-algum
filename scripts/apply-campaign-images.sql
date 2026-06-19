-- Cole no Supabase → SQL Editor → Run (uma vez)
-- Até 3 fotos por campanha

ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS image_paths TEXT[] NOT NULL DEFAULT '{}';

UPDATE public.campaigns
SET image_paths = ARRAY[image_path]
WHERE image_path IS NOT NULL
  AND cardinality(image_paths) = 0;

ALTER TABLE public.campaigns DROP CONSTRAINT IF EXISTS campaigns_image_paths_max3;
ALTER TABLE public.campaigns
  ADD CONSTRAINT campaigns_image_paths_max3 CHECK (cardinality(image_paths) <= 3);

CREATE OR REPLACE FUNCTION public.sync_campaign_image_path()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.image_path := CASE
    WHEN cardinality(NEW.image_paths) > 0 THEN NEW.image_paths[1]
    ELSE NULL
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_campaign_image_path ON public.campaigns;
CREATE TRIGGER trg_sync_campaign_image_path
  BEFORE INSERT OR UPDATE OF image_paths ON public.campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_campaign_image_path();

UPDATE public.campaigns
SET image_paths = image_paths
WHERE image_path IS NOT NULL;
