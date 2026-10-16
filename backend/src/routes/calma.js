import express from 'express';
import { rateLimit } from 'express-rate-limit';
import sql from '../db.js';
import verificarToken from '../middlewares/auth.js';

const router = express.Router();
const uuidValido = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

router.use(verificarToken);

router.get('/calma', async (req, res) => {
    try {
        const registros = await sql`
            SELECT id_calma, id_cliente, concluido_em, duracao_segundos
            FROM calma_historico
            WHERE id_usuario = ${req.id_usuario_logado}
            ORDER BY concluido_em DESC, id_calma DESC
            LIMIT 50
        `;

        return res.json(registros);
    } catch {
        return res.status(500).json({ erro: 'Não foi possível carregar o histórico de calma.' });
    }
});

// Também permite enviar os ciclos acumulados offline, com limite por conta.
const limitarRegistros = rateLimit({
    windowMs: 60 * 1000,
    limit: 60,
    keyGenerator: (req) => String(req.id_usuario_logado),
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { erro: 'Aguarde um minuto para continuar salvando o histórico.' },
});

router.post('/calma', limitarRegistros, async (req, res) => {
    const { id_cliente, concluido_em, id_usuario } = req.body || {};

    // O dono vem exclusivamente do JWT, nunca de um campo enviado pelo aplicativo.
    if (id_usuario !== undefined && id_usuario !== req.id_usuario_logado) {
        return res.status(403).json({ erro: 'Não é possível registrar ciclos para outra conta.' });
    }

    const data = typeof concluido_em === 'string' ? new Date(concluido_em) : null;

    if (typeof id_cliente !== 'string' || !uuidValido.test(id_cliente) || !data ||
        !Number.isFinite(data.getTime()) || data.getTime() < Date.UTC(2020, 0, 1) ||
        data.getTime() > Date.now() + 5 * 60 * 1000 || data.toISOString() !== concluido_em) {
        return res.status(400).json({ erro: 'Informe um identificador e uma data de conclusão válidos.' });
    }

    try {
        const registros = await sql`
            INSERT INTO calma_historico (id_usuario, id_cliente, concluido_em, duracao_segundos)
            VALUES (${req.id_usuario_logado}, ${id_cliente}, ${data.toISOString()}, 14)
            ON CONFLICT (id_usuario, id_cliente) DO NOTHING
            RETURNING id_calma, id_cliente, concluido_em, duracao_segundos
        `;

        if (registros.length) {
            return res.status(201).json(registros[0]);
        }

        // Um reenvio recebe o mesmo registro sem alterar sua data original.
        const existentes = await sql`
            SELECT id_calma, id_cliente, concluido_em, duracao_segundos
            FROM calma_historico
            WHERE id_usuario = ${req.id_usuario_logado} AND id_cliente = ${id_cliente}
        `;

        return res.json(existentes[0]);
    } catch {
        return res.status(500).json({ erro: 'Não foi possível salvar o ciclo de calma.' });
    }
});

export default router;
