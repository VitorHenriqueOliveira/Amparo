BEGIN;

-- Guarda recibos mesmo quando uma nota importada é excluída posteriormente.
CREATE TABLE IF NOT EXISTS public.importacao_historico (
    id_usuario INTEGER NOT NULL REFERENCES public.usuario(id_usuario),
    tipo TEXT NOT NULL CHECK (tipo IN ('emocoes', 'sono', 'diario')),
    chave TEXT NOT NULL CHECK (chave ~ '^[0-9a-f]{64}$'),
    assinatura TEXT NOT NULL CHECK (assinatura ~ '^[0-9a-f]{64}$'),
    resultado TEXT NOT NULL CHECK (resultado IN ('importado', 'existente', 'conflito')),
    id_registro INTEGER,
    importado_em TIMESTAMPTZ NOT NULL DEFAULT statement_timestamp(),
    PRIMARY KEY (id_usuario, tipo, chave)
);

-- O recibo e o registro são confirmados juntos, inclusive em envios concorrentes.
CREATE OR REPLACE FUNCTION public.importar_historico_legado(
    conta INTEGER, categoria TEXT, identificador TEXT, impressao TEXT, dados JSONB
) RETURNS TABLE (situacao TEXT, registro INTEGER) LANGUAGE plpgsql AS $$
DECLARE
    recibo public.importacao_historico%ROWTYPE;
    numero INTEGER;
    estado TEXT := 'importado';
    sono_existente public.sono%ROWTYPE;
BEGIN
    INSERT INTO public.importacao_historico (id_usuario, tipo, chave, assinatura, resultado)
    VALUES (conta, categoria, identificador, impressao, estado)
    ON CONFLICT DO NOTHING;

    IF NOT FOUND THEN
        SELECT * INTO recibo FROM public.importacao_historico
        WHERE id_usuario = conta AND tipo = categoria AND chave = identificador;
        RETURN QUERY SELECT CASE WHEN recibo.assinatura = impressao THEN recibo.resultado ELSE 'conflito' END,
            recibo.id_registro;
        RETURN;
    END IF;

    IF categoria = 'emocoes' THEN
        INSERT INTO public.registro_emocional (id_usuario, id_emocao, data_registro)
        VALUES (conta, dados->>'id_emocao', (dados->>'registrado_em')::timestamptz)
        RETURNING id_registro_emocao INTO numero;
    ELSIF categoria = 'diario' THEN
        INSERT INTO public.diario (id_usuario, descricao, data_registro)
        VALUES (conta, dados->>'descricao', coalesce((dados->>'registrado_em')::timestamptz,
            ((dados->>'dia')::date + TIME '12:00') AT TIME ZONE (dados->>'fuso_horario')))
        RETURNING id_diario INTO numero;
    ELSIF categoria = 'sono' THEN
        INSERT INTO public.sono (id_usuario, hora_dormiu, hora_acordou, data_registro, fuso_horario)
        VALUES (conta, (dados->>'hora_dormiu')::time, (dados->>'hora_acordou')::time,
            (dados->>'dia')::date, dados->>'fuso_horario')
        ON CONFLICT (id_usuario, data_registro) DO NOTHING
        RETURNING id_sono INTO numero;

        IF numero IS NULL THEN
            SELECT * INTO sono_existente FROM public.sono
            WHERE id_usuario = conta AND data_registro = (dados->>'dia')::date;
            numero := sono_existente.id_sono;
            estado := CASE WHEN sono_existente.hora_dormiu = (dados->>'hora_dormiu')::time
                AND sono_existente.hora_acordou = (dados->>'hora_acordou')::time
                THEN 'existente' ELSE 'conflito' END;
        END IF;
    ELSE
        RAISE EXCEPTION 'Categoria inválida' USING ERRCODE = '22023';
    END IF;

    UPDATE public.importacao_historico SET resultado = estado, id_registro = numero
    WHERE id_usuario = conta AND tipo = categoria AND chave = identificador;
    RETURN QUERY SELECT estado, numero;
END;
$$;

COMMIT;
