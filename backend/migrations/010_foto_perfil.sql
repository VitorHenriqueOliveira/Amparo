BEGIN;

-- Uma foto limitada por conta, persistida no banco já utilizado pela API.
CREATE TABLE IF NOT EXISTS public.usuario_foto (
    id_usuario INTEGER PRIMARY KEY REFERENCES public.usuario(id_usuario) ON DELETE CASCADE,
    conteudo BYTEA NOT NULL CHECK (octet_length(conteudo) BETWEEN 1 AND 524288),
    tipo_mime TEXT NOT NULL DEFAULT 'image/webp' CHECK (tipo_mime = 'image/webp'),
    largura INTEGER NOT NULL CHECK (largura BETWEEN 1 AND 512),
    altura INTEGER NOT NULL CHECK (altura BETWEEN 1 AND 512),
    versao TEXT NOT NULL CHECK (versao ~ '^[a-f0-9]{64}$'),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT statement_timestamp()
);

COMMIT;
