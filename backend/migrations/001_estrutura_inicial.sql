BEGIN;

CREATE TABLE IF NOT EXISTS public.usuario (
    id_usuario SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL,
    senha VARCHAR(255) NOT NULL,
    data_cadastro TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT (statement_timestamp() AT TIME ZONE 'UTC'),
    meta_sono_horas_min INTEGER NOT NULL DEFAULT 7,
    meta_sono_horas_max INTEGER NOT NULL DEFAULT 8
);

CREATE UNIQUE INDEX IF NOT EXISTS usuario_email_unico ON public.usuario (lower(trim(email)));

CREATE TABLE IF NOT EXISTS public.diario (
    id_diario SERIAL PRIMARY KEY,
    id_usuario INTEGER NOT NULL REFERENCES public.usuario(id_usuario),
    descricao TEXT,
    data_registro TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT (statement_timestamp() AT TIME ZONE 'UTC')
);

CREATE TABLE IF NOT EXISTS public.sono (
    id_sono SERIAL PRIMARY KEY,
    id_usuario INTEGER NOT NULL REFERENCES public.usuario(id_usuario),
    hora_dormiu TIME WITHOUT TIME ZONE NOT NULL,
    hora_acordou TIME WITHOUT TIME ZONE NOT NULL,
    data_registro DATE NOT NULL DEFAULT CURRENT_DATE
);

COMMIT;
