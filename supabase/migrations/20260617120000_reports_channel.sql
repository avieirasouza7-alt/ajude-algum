-- Canal de denúncias: tipos gerais e campanha opcional
ALTER TABLE public.reports ALTER COLUMN campaign_id DROP NOT NULL;

ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS report_type TEXT NOT NULL DEFAULT 'campanha';

ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS campaign_reference TEXT;

ALTER TABLE public.reports
  DROP CONSTRAINT IF EXISTS reports_report_type_check;

ALTER TABLE public.reports
  ADD CONSTRAINT reports_report_type_check CHECK (
    report_type IN ('campanha', 'fraude', 'conteudo', 'dados', 'plataforma', 'outro')
  );

CREATE INDEX IF NOT EXISTS idx_reports_type ON public.reports(report_type);
CREATE INDEX IF NOT EXISTS idx_reports_resolved ON public.reports(resolved);
