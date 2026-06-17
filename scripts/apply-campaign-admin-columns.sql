-- Cole no Supabase → SQL Editor → Run (uma vez)
-- Corrige: "Could not find the 'rejection_reason' column of 'campaigns'"

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

ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS admin_notes TEXT;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS hidden BOOLEAN NOT NULL DEFAULT false;
