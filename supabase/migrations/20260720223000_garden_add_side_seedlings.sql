-- Volta ao layout clássico: 5 mudas no quadrado original.
-- As mudas de teste laterais deixam de ser criadas; o cliente só mostra as 5 padrão.

-- Restaura posições das 5 mudas originais
UPDATE public.garden_seedlings SET pos_x =  0, pos_y = 0, pos_z =  0 WHERE id = 'esperanca-central';
UPDATE public.garden_seedlings SET pos_x = -5, pos_y = 0, pos_z = -5 WHERE id = 'muda-nascente';
UPDATE public.garden_seedlings SET pos_x =  5, pos_y = 0, pos_z = -5 WHERE id = 'muda-abraco';
UPDATE public.garden_seedlings SET pos_x = -5, pos_y = 0, pos_z =  5 WHERE id = 'muda-uniao';
UPDATE public.garden_seedlings SET pos_x =  5, pos_y = 0, pos_z =  5 WHERE id = 'muda-futuro';

-- Função no-op: não cria mudas extras (layout clássico de 5)
CREATE OR REPLACE FUNCTION public.garden_ensure_side_seedlings()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.garden_seedlings SET pos_x =  0, pos_y = 0, pos_z =  0 WHERE id = 'esperanca-central';
  UPDATE public.garden_seedlings SET pos_x = -5, pos_y = 0, pos_z = -5 WHERE id = 'muda-nascente';
  UPDATE public.garden_seedlings SET pos_x =  5, pos_y = 0, pos_z = -5 WHERE id = 'muda-abraco';
  UPDATE public.garden_seedlings SET pos_x = -5, pos_y = 0, pos_z =  5 WHERE id = 'muda-uniao';
  UPDATE public.garden_seedlings SET pos_x =  5, pos_y = 0, pos_z =  5 WHERE id = 'muda-futuro';
END;
$$;

REVOKE ALL ON FUNCTION public.garden_ensure_side_seedlings() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.garden_ensure_side_seedlings() TO authenticated;
GRANT EXECUTE ON FUNCTION public.garden_ensure_side_seedlings() TO service_role;
