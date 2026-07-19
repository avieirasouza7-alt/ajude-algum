-- Jardim: novos nomes das arvores / mudas
-- Usa escapes Unicode (E'...') para garantir acentos corretos no Postgres

UPDATE public.garden_seedlings SET name = E'\u00C1rvore da Esperan\u00E7a' WHERE id = 'esperanca-central';
UPDATE public.garden_seedlings SET name = E'\u00C1rvore da Solidariedade' WHERE id = 'muda-nascente';
UPDATE public.garden_seedlings SET name = E'\u00C1rvore da Generosidade' WHERE id = 'muda-abraco';
UPDATE public.garden_seedlings SET name = E'\u00C1rvore da Bondade' WHERE id = 'muda-uniao';
UPDATE public.garden_seedlings SET name = E'Campanha Uni\u00E3o' WHERE id = 'muda-futuro';
