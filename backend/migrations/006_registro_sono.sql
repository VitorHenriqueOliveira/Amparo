BEGIN;

ALTER TABLE public.usuario ADD COLUMN IF NOT EXISTS meta_sono_horas_min INTEGER NOT NULL DEFAULT 7;
ALTER TABLE public.usuario ADD COLUMN IF NOT EXISTS meta_sono_horas_max INTEGER NOT NULL DEFAULT 8;

CREATE TABLE IF NOT EXISTS public.sono (
    id_sono SERIAL PRIMARY KEY,
    id_usuario INTEGER NOT NULL REFERENCES public.usuario(id_usuario),
    hora_dormiu TIME WITHOUT TIME ZONE NOT NULL,
    hora_acordou TIME WITHOUT TIME ZONE NOT NULL,
    data_registro DATE NOT NULL,
    fuso_horario TEXT NOT NULL DEFAULT 'UTC'
);

ALTER TABLE public.sono ADD COLUMN IF NOT EXISTS fuso_horario TEXT NOT NULL DEFAULT 'UTC';
ALTER TABLE public.sono ALTER COLUMN data_registro DROP DEFAULT;

CREATE UNIQUE INDEX IF NOT EXISTS sono_usuario_data_unico ON public.sono (id_usuario, data_registro);

-- Falhas na integridade legada abortam a transação; nenhum histórico é descartado.
DO $$
DECLARE
    item RECORD;
BEGIN
    FOR item IN SELECT * FROM (VALUES
        ('usuario', 'usuario_meta_sono_valida', 'CHECK (meta_sono_horas_min BETWEEN 1 AND 24 AND meta_sono_horas_max BETWEEN meta_sono_horas_min AND 24)'),
        ('sono', 'sono_horarios_validos', 'CHECK (hora_dormiu < TIME ''24:00'' AND hora_acordou < TIME ''24:00'' AND hora_dormiu <> hora_acordou)'),
        ('sono', 'sono_data_finita', 'CHECK (isfinite(data_registro))'),
        ('sono', 'sono_fuso_nao_vazio', 'CHECK (length(fuso_horario) BETWEEN 1 AND 100 AND fuso_horario ~ ''[^[:space:]]'')')
    ) AS regras(tabela, nome, definicao)
    LOOP
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = item.nome AND conrelid = format('public.%I', item.tabela)::regclass) THEN
            EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT %I %s', item.tabela, item.nome, item.definicao);
        END IF;
    END LOOP;
END $$;

COMMIT;
