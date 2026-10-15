BEGIN;

CREATE TABLE IF NOT EXISTS public.emocao (
    id_emocao VARCHAR PRIMARY KEY,
    descricao TEXT
);

-- Completa o catálogo sem alterar as descrições que já existem.
INSERT INTO public.emocao (id_emocao, descricao) VALUES
    ('Feliz', 'Alegre, Contente, Eufórico, Animado, Satisfeito, Realizado, Tranquilo, Risonho, Feliz'),
    ('Triste', 'Solidão, Desânimo, Melancolia, Frustração, Culpa, Luto, Desolado, Emotivo, Infeliz, Angustiado, Desespero'),
    ('Neutro', 'Imparcial, Indefinido, Insensível, Indiferente, Distante'),
    ('Raiva', 'Ódio, Irritação, Indignação, Rancor, Repulsa, Impaciente, Nervoso, Ansioso, Aborrecido')
ON CONFLICT (id_emocao) DO NOTHING;

-- Adequa o nome da chave existente sem recriar a tabela ou seus registros.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'registro_emocional'
            AND column_name = 'id_registro_emocional'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'registro_emocional'
            AND column_name = 'id_registro_emocao'
    ) THEN
        ALTER TABLE public.registro_emocional
            RENAME COLUMN id_registro_emocional TO id_registro_emocao;
    END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS public.registro_emocional (
    id_registro_emocao SERIAL PRIMARY KEY,
    id_usuario INTEGER NOT NULL REFERENCES public.usuario(id_usuario),
    id_emocao VARCHAR NOT NULL REFERENCES public.emocao(id_emocao),
    data_registro TIMESTAMP WITHOUT TIME ZONE NOT NULL
        DEFAULT (statement_timestamp() AT TIME ZONE 'UTC')
);

-- Preserva os timestamps antigos em UTC e fixa o fuso dos novos registros.
ALTER TABLE public.registro_emocional
    ALTER COLUMN data_registro SET DEFAULT (statement_timestamp() AT TIME ZONE 'UTC');

-- A hora sempre deriva do mesmo timestamp, inclusive no histórico já salvo.
ALTER TABLE public.registro_emocional
    ADD COLUMN IF NOT EXISTS hora_registro TIME WITHOUT TIME ZONE
        GENERATED ALWAYS AS (data_registro::time) STORED NOT NULL;

-- O índice permite vários registros por dia e acelera a consulta por conta.
CREATE INDEX IF NOT EXISTS registro_emocional_usuario_data_idx
    ON public.registro_emocional (id_usuario, data_registro DESC, id_registro_emocao DESC);

COMMIT;
