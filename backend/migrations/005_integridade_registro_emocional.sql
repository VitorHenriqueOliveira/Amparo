BEGIN;

-- Preserva os instantes legados em UTC, inclusive quando a sessão usa outro fuso.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'registro_emocional'
            AND column_name = 'data_registro' AND data_type = 'timestamp without time zone'
    ) THEN
        ALTER TABLE public.registro_emocional DROP COLUMN hora_registro;
        ALTER TABLE public.registro_emocional ALTER COLUMN data_registro DROP DEFAULT;
        ALTER TABLE public.registro_emocional ALTER COLUMN data_registro TYPE TIMESTAMPTZ
            USING data_registro AT TIME ZONE 'UTC';
    END IF;
END $$;

ALTER TABLE public.registro_emocional ALTER COLUMN data_registro SET DEFAULT statement_timestamp();

ALTER TABLE public.registro_emocional ADD COLUMN IF NOT EXISTS hora_registro TIME WITHOUT TIME ZONE
    GENERATED ALWAYS AS ((data_registro AT TIME ZONE 'UTC')::time) STORED NOT NULL;

-- Registros antigos ficam sem UUID; cada nova confirmação é identificada pelo aplicativo.
ALTER TABLE public.registro_emocional ADD COLUMN IF NOT EXISTS id_cliente UUID;

CREATE UNIQUE INDEX IF NOT EXISTS registro_emocional_usuario_cliente_unico
    ON public.registro_emocional (id_usuario, id_cliente);

CREATE INDEX IF NOT EXISTS registro_emocional_emocao_idx ON public.registro_emocional (id_emocao);

ALTER TABLE public.emocao ALTER COLUMN descricao SET NOT NULL;

DO $$
DECLARE
    item RECORD;
BEGIN
    FOR item IN SELECT * FROM (VALUES
        ('emocao', 'emocao_id_valido', 'CHECK (id_emocao ~ ''[^[:space:]]'')'),
        ('emocao', 'emocao_descricao_valida', 'CHECK (descricao ~ ''[^[:space:]]'')'),
        ('registro_emocional', 'registro_emocional_data_finita', 'CHECK (isfinite(data_registro))')
    ) AS regras(tabela, nome, definicao)
    LOOP
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = item.nome AND conrelid = format('public.%I', item.tabela)::regclass) THEN
            EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT %I %s', item.tabela, item.nome, item.definicao);
        END IF;
    END LOOP;
END $$;

COMMIT;
