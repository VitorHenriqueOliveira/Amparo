BEGIN;

CREATE TABLE IF NOT EXISTS public.notificacao_dispositivo (
    id_instalacao UUID PRIMARY KEY,
    id_usuario INTEGER NOT NULL REFERENCES public.usuario(id_usuario) ON DELETE CASCADE,
    expo_token TEXT NOT NULL UNIQUE CHECK (expo_token ~ '^(ExpoPushToken|ExponentPushToken)\[[A-Za-z0-9_-]{10,200}\]$'),
    permissao BOOLEAN NOT NULL,
    st_ativo BOOLEAN NOT NULL DEFAULT TRUE,
    versao UUID NOT NULL,
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT statement_timestamp()
);

CREATE INDEX IF NOT EXISTS notificacao_dispositivo_usuario_idx
    ON public.notificacao_dispositivo (id_usuario) WHERE st_ativo AND permissao;

CREATE TABLE IF NOT EXISTS public.notificacao_lembrete (
    id_lembrete SERIAL PRIMARY KEY,
    id_usuario INTEGER NOT NULL REFERENCES public.usuario(id_usuario) ON DELETE CASCADE,
    tipo TEXT NOT NULL CHECK (tipo IN ('emocao', 'diario', 'sono')),
    horario TIME WITHOUT TIME ZONE NOT NULL CHECK (horario < TIME '24:00' AND extract(second FROM horario) = 0),
    fuso_horario TEXT NOT NULL CHECK (length(fuso_horario) BETWEEN 1 AND 100),
    st_ativo BOOLEAN NOT NULL DEFAULT TRUE,
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT statement_timestamp(),
    UNIQUE (id_usuario, tipo)
);

-- A reserva diária impede duplicações mesmo com dois processos executando juntos.
CREATE TABLE IF NOT EXISTS public.notificacao_envio (
    id_envio BIGSERIAL PRIMARY KEY,
    id_lembrete INTEGER NOT NULL REFERENCES public.notificacao_lembrete(id_lembrete) ON DELETE CASCADE,
    id_instalacao UUID NOT NULL REFERENCES public.notificacao_dispositivo(id_instalacao) ON DELETE CASCADE,
    versao_dispositivo UUID NOT NULL,
    dia_local DATE NOT NULL CHECK (isfinite(dia_local)),
    estado TEXT NOT NULL DEFAULT 'pendente'
        CHECK (estado IN ('pendente', 'enviando', 'aceito', 'entregue', 'falha', 'incerto', 'cancelado')),
    tentativas INTEGER NOT NULL DEFAULT 0 CHECK (tentativas BETWEEN 0 AND 3),
    ticket TEXT,
    codigo_erro TEXT,
    proxima_tentativa_em TIMESTAMPTZ NOT NULL DEFAULT statement_timestamp(),
    criado_em TIMESTAMPTZ NOT NULL DEFAULT statement_timestamp(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT statement_timestamp(),
    UNIQUE (id_lembrete, id_instalacao, dia_local)
);

CREATE INDEX IF NOT EXISTS notificacao_envio_pendente_idx
    ON public.notificacao_envio (proxima_tentativa_em) WHERE estado = 'pendente';
CREATE INDEX IF NOT EXISTS notificacao_envio_recibo_idx
    ON public.notificacao_envio (atualizado_em) WHERE estado = 'aceito';

COMMIT;
