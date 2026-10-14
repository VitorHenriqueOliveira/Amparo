-- Guarda somente ciclos concluídos e vincula cada registro à conta do usuário.
CREATE TABLE IF NOT EXISTS public.calma_historico (
    id_calma SERIAL PRIMARY KEY,
    id_usuario INTEGER NOT NULL REFERENCES public.usuario(id_usuario) ON DELETE CASCADE,
    id_cliente UUID NOT NULL,
    concluido_em TIMESTAMPTZ NOT NULL,
    duracao_segundos SMALLINT NOT NULL CHECK (duracao_segundos > 0),
    recebido_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT calma_historico_usuario_cliente_unico UNIQUE (id_usuario, id_cliente)
);

-- Evita duplicação no reenvio offline e acelera a consulta do histórico pessoal.
CREATE INDEX IF NOT EXISTS calma_historico_usuario_data
    ON public.calma_historico (id_usuario, concluido_em DESC, id_calma DESC);
