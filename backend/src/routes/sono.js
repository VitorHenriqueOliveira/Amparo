import express from 'express';
import sql from '../db.js';
import verificarToken from '../middlewares/auth.js';

const router = express.Router();
const formatoHora = /^([01]\d|2[0-3]):[0-5]\d$/;
router.use('/sono', verificarToken);

function fusoValido(valor) {
    if (typeof valor !== 'string' || valor.length > 100 || /^[+-]/.test(valor)) return null;
    try {
        return new Intl.DateTimeFormat('en', { timeZone: valor }).resolvedOptions().timeZone;
    } catch {
        return null;
    }
}

function diaValido(valor) {
    if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
    const data = new Date(valor + 'T00:00:00Z');
    return Number.isFinite(data.getTime()) && data.toISOString().slice(0, 10) === valor;
}

function camposPermitidos(body, campos) {
    return body && !Array.isArray(body) && Object.keys(body).every((campo) => campos.includes(campo));
}

router.get('/sono', async (req, res) => {
    const fuso = fusoValido(req.query.fuso_horario);
    if (!fuso) return res.status(400).json({ erro: 'Informe um fuso horário válido.' });
    try {
        const [dados] = await sql`
            WITH contexto AS (
                SELECT statement_timestamp() AS agora,
                    (statement_timestamp() AT TIME ZONE ${fuso})::date AS hoje
            )
            SELECT u.meta_sono_horas_min, u.meta_sono_horas_max,
                c.hoje::text AS hoje, c.agora,
                ((c.hoje + 1)::timestamp AT TIME ZONE ${fuso}) AS proxima_atualizacao_em,
                s.id_sono, s.data_registro::text AS data_registro,
                to_char(s.hora_dormiu, 'HH24:MI') AS hora_dormiu,
                to_char(s.hora_acordou, 'HH24:MI') AS hora_acordou, s.fuso_horario
            FROM usuario u CROSS JOIN contexto c
            LEFT JOIN sono s ON s.id_usuario = u.id_usuario AND s.data_registro = c.hoje
            WHERE u.id_usuario = ${req.id_usuario_logado}
        `;
        if (!dados) return res.status(401).json({ erro: 'Sessão inválida.' });
        const { hoje, agora, proxima_atualizacao_em, meta_sono_horas_min, meta_sono_horas_max, ...registro } = dados;
        return res.json({ hoje, agora, proxima_atualizacao_em, meta_sono_horas_min,
            meta_sono_horas_max, registro: registro.id_sono ? registro : null });
    } catch {
        return res.status(500).json({ erro: 'Não foi possível carregar seus horários de sono.' });
    }
});

router.get('/sono/historico', async (req, res) => {
    try {
        const registros = await sql`
            SELECT id_sono, data_registro::text AS data_registro,
                to_char(hora_dormiu, 'HH24:MI') AS hora_dormiu,
                to_char(hora_acordou, 'HH24:MI') AS hora_acordou, fuso_horario
            FROM sono WHERE id_usuario = ${req.id_usuario_logado}
            ORDER BY data_registro DESC, id_sono DESC
        `;
        return res.json(registros);
    } catch {
        return res.status(500).json({ erro: 'Não foi possível carregar o histórico de sono.' });
    }
});

router.post('/sono', async (req, res) => {
    const { hora_dormiu, hora_acordou, fuso_horario, dia_referencia, id_usuario } = req.body || {};
    if (id_usuario !== undefined && id_usuario !== req.id_usuario_logado) {
        return res.status(403).json({ erro: 'Não é possível registrar sono para outra conta.' });
    }
    const fuso = fusoValido(fuso_horario);
    if (!camposPermitidos(req.body, ['hora_dormiu', 'hora_acordou', 'fuso_horario', 'dia_referencia', 'id_usuario'])
        || typeof hora_dormiu !== 'string' || typeof hora_acordou !== 'string'
        || !formatoHora.test(hora_dormiu) || !formatoHora.test(hora_acordou)
        || hora_dormiu === hora_acordou || !fuso || !diaValido(dia_referencia)) {
        return res.status(400).json({ erro: 'Confira os horários, a data de referência e o fuso horário.' });
    }
    try {
        // O dia é calculado pelo servidor. A referência apenas impede salvar um formulário vencido.
        const [registro] = await sql`
            WITH contexto AS (SELECT (statement_timestamp() AT TIME ZONE ${fuso})::date AS hoje)
            INSERT INTO sono (id_usuario, hora_dormiu, hora_acordou, data_registro, fuso_horario)
            SELECT ${req.id_usuario_logado}, ${hora_dormiu}::time, ${hora_acordou}::time, hoje, ${fuso}
            FROM contexto WHERE hoje = ${dia_referencia}::date
            ON CONFLICT (id_usuario, data_registro) DO UPDATE
                SET hora_dormiu = EXCLUDED.hora_dormiu, hora_acordou = EXCLUDED.hora_acordou,
                    fuso_horario = EXCLUDED.fuso_horario
            RETURNING id_sono, data_registro::text AS data_registro,
                to_char(hora_dormiu, 'HH24:MI') AS hora_dormiu,
                to_char(hora_acordou, 'HH24:MI') AS hora_acordou, fuso_horario
        `;
        if (!registro) return res.status(409).json({ codigo: 'DIA_ALTERADO', erro: 'O dia mudou. Confira a data e salve novamente.' });
        return res.json(registro);
    } catch (error) {
        if (error.code === '23503') return res.status(401).json({ erro: 'Sessão inválida.' });
        return res.status(500).json({ erro: 'Não foi possível salvar seus horários. Tente novamente.' });
    }
});

router.put('/sono/meta', async (req, res) => {
    const { meta_sono_horas_min: minimo, meta_sono_horas_max: maximo } = req.body || {};
    if (!camposPermitidos(req.body, ['meta_sono_horas_min', 'meta_sono_horas_max'])
        || !Number.isInteger(minimo) || !Number.isInteger(maximo)
        || minimo < 1 || maximo > 24 || minimo > maximo) {
        return res.status(400).json({ erro: 'Escolha uma faixa de horas inteiras entre 1 e 24, com o mínimo até o máximo.' });
    }
    try {
        const [meta] = await sql`
            UPDATE usuario SET meta_sono_horas_min = ${minimo}, meta_sono_horas_max = ${maximo}
            WHERE id_usuario = ${req.id_usuario_logado}
            RETURNING meta_sono_horas_min, meta_sono_horas_max
        `;
        if (!meta) return res.status(401).json({ erro: 'Sessão inválida.' });
        return res.json(meta);
    } catch {
        return res.status(500).json({ erro: 'Não foi possível salvar sua meta. Tente novamente.' });
    }
});

export default router;
