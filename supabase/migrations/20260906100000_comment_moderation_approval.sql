-- Moderação de comentários: novos comentários aguardam aprovação do administrador.
ALTER TABLE public.comments
  ADD COLUMN status text NOT NULL DEFAULT 'pending'
  CHECK (status IN ('pending', 'approved'));

-- Comentários já existentes continuam visíveis após a implantação desta regra.
UPDATE public.comments
SET status = 'approved'
WHERE status = 'pending';

GRANT SELECT, INSERT, UPDATE, DELETE ON public.comments TO authenticated;

DROP POLICY IF EXISTS "Anyone views comments" ON public.comments;
CREATE POLICY "Anyone views approved comments"
  ON public.comments
  FOR SELECT
  USING (status = 'approved' OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins approve comments"
  ON public.comments
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
