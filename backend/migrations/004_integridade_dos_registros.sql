BEGIN;

-- O banco anterior usava GMT. A conversão explicita UTC para preservar cada instante.
DO $$
DECLARE
    item RECORD;
BEGIN
    FOR item IN SELECT * FROM (VALUES ('usuario', 'data_cadastro'), ('diario', 'data_registro'), ('registro_emocional', 'data_registro')) AS campos(tabela, coluna)
    LOOP
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = item.tabela AND column_name = item.coluna AND data_type = 'timestamp without time zone') THEN
            IF item.tabela = 'registro_emocional' THEN
                ALTER TABLE public.registro_emocional DROP COLUMN hora_registro;
            END IF;
            EXECUTE format('ALTER TABLE public.%I ALTER COLUMN %I DROP DEFAULT', item.tabela, item.coluna);
            EXECUTE format('ALTER TABLE public.%I ALTER COLUMN %I TYPE TIMESTAMPTZ USING %I AT TIME ZONE ''UTC''', item.tabela, item.coluna, item.coluna);
        END IF;
        EXECUTE format('ALTER TABLE public.%I ALTER COLUMN %I SET DEFAULT statement_timestamp()', item.tabela, item.coluna);
    END LOOP;
END $$;

-- Mantida por compatibilidade com a issue 2; sempre derivada do mesmo instante em UTC.
ALTER TABLE public.registro_emocional ADD COLUMN IF NOT EXISTS hora_registro TIME WITHOUT TIME ZONE
    GENERATED ALWAYS AS ((data_registro AT TIME ZONE 'UTC')::time) STORED NOT NULL;

ALTER TABLE public.registro_emocional ADD COLUMN IF NOT EXISTS id_cliente UUID;

CREATE UNIQUE INDEX IF NOT EXISTS registro_emocional_usuario_cliente_unico
    ON public.registro_emocional (id_usuario, id_cliente);

ALTER TABLE public.diario ALTER COLUMN descricao SET NOT NULL;

ALTER TABLE public.emocao ALTER COLUMN descricao SET NOT NULL;

-- A data do sono é um dia civil, associado ao fuso do usuário pela API.
ALTER TABLE public.sono ALTER COLUMN data_registro DROP DEFAULT;

ALTER TABLE public.sono ADD COLUMN IF NOT EXISTS fuso_horario TEXT NOT NULL DEFAULT 'UTC';

CREATE UNIQUE INDEX IF NOT EXISTS sono_usuario_data_unico ON public.sono (id_usuario, data_registro);

CREATE INDEX IF NOT EXISTS diario_usuario_data_idx ON public.diario (id_usuario, data_registro DESC, id_diario DESC);

CREATE INDEX IF NOT EXISTS registro_emocional_emocao_idx ON public.registro_emocional (id_emocao);

-- As validações impedem dados inválidos também em gravações fora da API.
DO $$
DECLARE
    item RECORD;
BEGIN
    FOR item IN SELECT * FROM (VALUES
        ('usuario', 'usuario_nome_valido', 'CHECK (length(btrim(nome)) BETWEEN 1 AND 100 AND nome ~ ''[^[:space:]]'')'),
        ('usuario', 'usuario_email_valido', 'CHECK (btrim(email) ~ ''^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'')'),
        ('usuario', 'usuario_senha_nao_vazia', 'CHECK (senha ~ ''[^[:space:]]'')'),
        ('usuario', 'usuario_meta_sono_valida', 'CHECK (meta_sono_horas_min BETWEEN 1 AND 24 AND meta_sono_horas_max BETWEEN meta_sono_horas_min AND 24)'),
        ('usuario', 'usuario_data_finita', 'CHECK (isfinite(data_cadastro))'),
        ('diario', 'diario_descricao_valida', 'CHECK (length(btrim(descricao)) BETWEEN 1 AND 10000 AND descricao ~ ''[^[:space:]]'')'),
        ('diario', 'diario_data_finita', 'CHECK (isfinite(data_registro))'),
        ('emocao', 'emocao_id_valido', 'CHECK (id_emocao ~ ''[^[:space:]]'')'),
        ('emocao', 'emocao_descricao_valida', 'CHECK (descricao ~ ''[^[:space:]]'')'),
        ('registro_emocional', 'registro_emocional_data_finita', 'CHECK (isfinite(data_registro))'),
        ('sono', 'sono_horarios_validos', 'CHECK (hora_dormiu < TIME ''24:00'' AND hora_acordou < TIME ''24:00'' AND hora_dormiu <> hora_acordou)'),
        ('sono', 'sono_data_finita', 'CHECK (isfinite(data_registro))'),
        ('sono', 'sono_fuso_nao_vazio', 'CHECK (length(fuso_horario) BETWEEN 1 AND 100 AND fuso_horario ~ ''[^[:space:]]'')'),
        ('calma_historico', 'calma_historico_datas_finitas', 'CHECK (isfinite(concluido_em) AND isfinite(recebido_em))')
    ) AS regras(tabela, nome, definicao)
    LOOP
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = item.nome AND conrelid = format('public.%I', item.tabela)::regclass) THEN
            EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT %I %s', item.tabela, item.nome, item.definicao);
        END IF;
    END LOOP;
END $$;

COMMIT;
