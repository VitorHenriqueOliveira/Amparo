import { criarClienteExpo } from './expo-push.js';

export function criarProcessadorNotificacoes({ sql, cliente = criarClienteExpo() }) {
    async function invalidarDispositivo(envio) {
        await sql`
            UPDATE notificacao_dispositivo SET st_ativo = FALSE, permissao = FALSE
            WHERE id_instalacao = ${envio.id_instalacao} AND versao = ${envio.versao_dispositivo}
        `;
    }

    async function confirmar(envio, estado, codigo, ticket, instante) {
        await sql`
            UPDATE notificacao_envio SET estado = ${estado}, codigo_erro = ${codigo}, ticket = ${ticket},
                atualizado_em = ${instante}::timestamptz,
                proxima_tentativa_em = ${instante}::timestamptz + make_interval(mins => power(2, tentativas)::int)
            WHERE id_envio = ${envio.id_envio}
        `;
    }

    async function conferirRecibos(instante) {
        const envios = await sql`
            SELECT id_envio, id_instalacao, versao_dispositivo, ticket, criado_em
            FROM notificacao_envio
            WHERE estado = 'aceito' AND atualizado_em <= ${instante}::timestamptz - interval '15 minutes'
            ORDER BY atualizado_em LIMIT 100
        `;

        if (!envios.length) return 0;

        let recibos;

        try {
            recibos = await cliente.recibos(envios.map((envio) => envio.ticket));
        } catch {
            return 0;
        }

        let confirmados = 0;

        for (const envio of envios) {
            const recibo = recibos[envio.ticket];

            if (recibo?.status === 'ok') {
                await confirmar(envio, 'entregue', null, envio.ticket, instante);
                confirmados++;
            } else if (recibo?.status === 'error') {
                const invalido = recibo.details?.error === 'DeviceNotRegistered';

                if (invalido) await invalidarDispositivo(envio);
                await confirmar(envio, 'falha', invalido ? 'DeviceNotRegistered' : 'FalhaEntrega', envio.ticket, instante);
                confirmados++;
            } else if (Date.parse(instante) - new Date(envio.criado_em).getTime() >= 24 * 60 * 60 * 1000) {
                await confirmar(envio, 'incerto', 'ReciboAusente', envio.ticket, instante);
            }
        }

        return confirmados;
    }

    return {
        async processar(agora) {
            const obterInstante = () => (agora ?? new Date()).toISOString();
            const instante = obterInstante();
            const resumo = { reservados: 0, aceitos: 0, falhas: 0, recibos: 0 };

            // A janela evita disparar lembretes antigos após uma pausa da hospedagem.
            const reservas = await sql`
                INSERT INTO notificacao_envio (id_lembrete, id_instalacao, versao_dispositivo, dia_local,
                    criado_em, atualizado_em, proxima_tentativa_em)
                SELECT l.id_lembrete, d.id_instalacao, d.versao,
                    (${instante}::timestamptz AT TIME ZONE l.fuso_horario)::date,
                    ${instante}::timestamptz, ${instante}::timestamptz, ${instante}::timestamptz
                FROM notificacao_lembrete l
                JOIN usuario u ON u.id_usuario = l.id_usuario AND u.st_notificacao
                JOIN notificacao_dispositivo d ON d.id_usuario = l.id_usuario AND d.st_ativo AND d.permissao
                JOIN pg_timezone_names f ON f.name = l.fuso_horario
                WHERE l.st_ativo
                    AND (${instante}::timestamptz AT TIME ZONE l.fuso_horario) -
                        ((${instante}::timestamptz AT TIME ZONE l.fuso_horario)::date + l.horario)
                        >= interval '0 minutes'
                    AND (${instante}::timestamptz AT TIME ZONE l.fuso_horario) -
                        ((${instante}::timestamptz AT TIME ZONE l.fuso_horario)::date + l.horario)
                        < interval '15 minutes'
                    AND NOT EXISTS (SELECT 1 FROM notificacao_envio e WHERE e.id_lembrete = l.id_lembrete
                        AND e.id_instalacao = d.id_instalacao
                        AND e.dia_local = (${instante}::timestamptz AT TIME ZONE l.fuso_horario)::date)
                ORDER BY l.id_lembrete, d.id_instalacao LIMIT 100
                ON CONFLICT (id_lembrete, id_instalacao, dia_local) DO NOTHING
                RETURNING id_envio
            `;
            resumo.reservados = reservas.length;

            const pendentes = await sql`
                SELECT id_envio FROM notificacao_envio
                WHERE estado = 'pendente' AND tentativas < 3 AND proxima_tentativa_em <= ${instante}::timestamptz
                ORDER BY id_envio LIMIT 100
            `;

            for (const pendente of pendentes) {
                const instante = obterInstante();

                // Confere conta, preferência, permissão, horário e vínculo novamente no momento do envio.
                const [envio] = await sql`
                    UPDATE notificacao_envio e SET estado = 'enviando', tentativas = e.tentativas + 1,
                        atualizado_em = ${instante}::timestamptz
                    FROM notificacao_lembrete l, notificacao_dispositivo d, usuario u
                    WHERE e.id_envio = ${pendente.id_envio} AND e.estado = 'pendente'
                        AND e.tentativas < 3 AND e.proxima_tentativa_em <= ${instante}::timestamptz
                        AND l.id_lembrete = e.id_lembrete AND l.st_ativo
                        AND d.id_instalacao = e.id_instalacao AND d.st_ativo AND d.permissao
                        AND d.versao = e.versao_dispositivo AND d.id_usuario = l.id_usuario
                        AND u.id_usuario = l.id_usuario AND u.st_notificacao
                        AND e.dia_local = (${instante}::timestamptz AT TIME ZONE l.fuso_horario)::date
                        AND (${instante}::timestamptz AT TIME ZONE l.fuso_horario) -
                            (e.dia_local + l.horario) >= interval '0 minutes'
                        AND (${instante}::timestamptz AT TIME ZONE l.fuso_horario) -
                            (e.dia_local + l.horario) < interval '15 minutes'
                    RETURNING e.id_envio, e.id_instalacao, e.versao_dispositivo, e.tentativas, d.expo_token
                `;

                if (!envio) {
                    await sql`
                        UPDATE notificacao_envio SET estado = 'cancelado', atualizado_em = ${instante}::timestamptz
                        WHERE id_envio = ${pendente.id_envio} AND estado = 'pendente'
                            AND proxima_tentativa_em <= ${instante}::timestamptz
                    `;
                    continue;
                }

                let ticket;

                try {
                    ticket = await cliente.enviar(envio.expo_token);
                } catch (error) {
                    const repetir = error.repetivel && envio.tentativas < 3;

                    // Um timeout pode acontecer depois da aceitação. Não repete um envio de resultado desconhecido.
                    await confirmar(envio, repetir ? 'pendente' : error.repetivel ? 'falha' : 'incerto',
                        error.repetivel ? 'LimiteServico' : 'EnvioSemConfirmacao', null, instante);
                    resumo.falhas++;
                    continue;
                }

                if (ticket.status === 'ok') {
                    await confirmar(envio, 'aceito', null, ticket.id, instante);
                    resumo.aceitos++;
                } else {
                    const invalido = ticket.details?.error === 'DeviceNotRegistered';
                    const repetir = ticket.details?.error === 'MessageRateExceeded' && envio.tentativas < 3;

                    if (invalido) await invalidarDispositivo(envio);
                    await confirmar(envio, repetir ? 'pendente' : 'falha',
                        invalido ? 'DeviceNotRegistered' : repetir ? 'LimiteServico' : 'FalhaEnvio', null, instante);
                    resumo.falhas++;
                }
            }

            const concluidoEm = obterInstante();
            resumo.recibos = await conferirRecibos(concluidoEm);

            await sql`
                UPDATE notificacao_envio SET estado = 'incerto', codigo_erro = 'ProcessoInterrompido'
                WHERE estado = 'enviando' AND atualizado_em < ${concluidoEm}::timestamptz - interval '15 minutes'
            `;
            await sql`DELETE FROM notificacao_envio WHERE criado_em < ${concluidoEm}::timestamptz - interval '30 days'`;

            return resumo;
        },
    };
}
