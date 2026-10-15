import express from 'express';
import sql from '../db.js';
import verificarToken from '../middlewares/auth.js';

const router = express.Router();
const emocoesPermitidas = new Set(['Feliz', 'Triste', 'Neutro', 'Raiva']);
const formatoIdCliente = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

router.use('/emocoes', verificarToken);

router.get('/emocoes', async (req, res) => {
    try {
        const registros = await sql`
            SELECT id_registro_emocao, id_usuario, id_emocao,
                (data_registro AT TIME ZONE 'UTC')::date::text AS data_registro,
                hora_registro::text AS hora_registro,
                data_registro AS registrado_em
            FROM registro_emocional
            WHERE id_usuario = ${req.id_usuario_logado}
            ORDER BY registro_emocional.data_registro DESC, id_registro_emocao DESC
        `;

        return res.json(registros);
    } catch {
        return res.status(500).json({ erro: 'Não foi possível carregar os registros emocionais.' });
    }
});

router.post('/emocoes', async (req, res) => {
    const { id_emocao, id_usuario, id_cliente } = req.body || {};

    // A conta é obtida exclusivamente do token autenticado.
    if (id_usuario !== undefined && id_usuario !== req.id_usuario_logado) {
        return res.status(403).json({ erro: 'Não é possível registrar emoções para outra conta.' });
    }

    if (!emocoesPermitidas.has(id_emocao)) {
        return res.status(400).json({ erro: 'Selecione Feliz, Triste, Neutro ou Raiva.' });
    }

    if (typeof id_cliente !== 'string' || !formatoIdCliente.test(id_cliente)) {
        return res.status(400).json({ erro: 'Informe um identificador UUID válido para a confirmação.' });
    }

    // O aplicativo não pode fornecer identificadores, datas ou horários do registro.
    if (Object.keys(req.body).some((campo) => !['id_emocao', 'id_usuario', 'id_cliente'].includes(campo))) {
        return res.status(400).json({ erro: 'Envie somente a emoção. A data e a hora são geradas pelo servidor.' });
    }

    try {
        const registros = await sql`
            INSERT INTO registro_emocional (id_usuario, id_emocao, id_cliente)
            VALUES (${req.id_usuario_logado}, ${id_emocao}, ${id_cliente})
            ON CONFLICT (id_usuario, id_cliente) DO NOTHING
            RETURNING id_registro_emocao, id_usuario, id_emocao,
                (data_registro AT TIME ZONE 'UTC')::date::text AS data_registro,
                hora_registro::text AS hora_registro,
                data_registro AS registrado_em
        `;

        if (registros.length) return res.status(201).json(registros[0]);

        // Um reenvio recupera o registro original sem alterar sua data de confirmação.
        const existentes = await sql`
            SELECT id_registro_emocao, id_usuario, id_emocao,
                (data_registro AT TIME ZONE 'UTC')::date::text AS data_registro,
                hora_registro::text AS hora_registro, data_registro AS registrado_em
            FROM registro_emocional
            WHERE id_usuario = ${req.id_usuario_logado} AND id_cliente = ${id_cliente}
        `;

        if (!existentes.length || existentes[0].id_emocao !== id_emocao) {
            return res.status(409).json({ erro: 'Esta confirmação já foi usada para outra emoção.' });
        }

        return res.json(existentes[0]);
    } catch {
        return res.status(500).json({ erro: 'Não foi possível salvar a emoção. Tente novamente.' });
    }
});

export default router;
