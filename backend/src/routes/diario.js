import express from 'express';
import sql from '../db.js';
import verificarToken from '../middlewares/auth.js';

const router = express.Router();
router.use('/diario', verificarToken);

function idValido(valor) {
    return /^\d+$/.test(String(valor)) && Number.isSafeInteger(Number(valor)) && Number(valor) > 0;
}

// Impede descrições vazias ou excessivamente grandes.
function descricaoValida(descricao) {
    return typeof descricao === 'string' && descricao.trim().length > 0 && descricao.trim().length <= 10000;
}

router.get('/diario/:id_usuario', async (req, res) => {
    const { id_usuario } = req.params;
    if (!idValido(id_usuario)) return res.status(400).json({ erro: 'Usuário inválido.' });
    if (Number(id_usuario) !== req.id_usuario_logado) {
        return res.status(403).json({ erro: 'Você não tem permissão para ver as notas de outro usuário.' });
    }
    try {
        const notas = await sql`SELECT id_diario, descricao, data_registro FROM diario WHERE id_usuario = ${req.id_usuario_logado} ORDER BY data_registro DESC, id_diario DESC`;
        return res.json(notas);
    } catch {
        return res.status(500).json({ erro: 'Erro ao buscar notas.' });
    }
});

router.post('/diario', async (req, res) => {
    const { id_usuario, descricao } = req.body || {};
    if (id_usuario !== undefined && Number(id_usuario) !== req.id_usuario_logado) {
        return res.status(403).json({ erro: 'Não é possível criar notas para outro usuário.' });
    }
    if (!descricaoValida(descricao)) {
        return res.status(400).json({ erro: 'A descrição deve conter entre 1 e 10000 caracteres.' });
    }
    try {
        const novaNota = await sql`INSERT INTO diario (id_usuario, descricao) VALUES (${req.id_usuario_logado}, ${descricao.trim()}) RETURNING *`;
        return res.status(201).json(novaNota[0]);
    } catch {
        return res.status(500).json({ erro: 'Erro ao criar nota.' });
    }
});

router.put('/diario/:id_diario', async (req, res) => {
    const { id_diario } = req.params;
    const { descricao } = req.body || {};
    if (!idValido(id_diario) || !descricaoValida(descricao)) {
        return res.status(400).json({ erro: 'Registro ou descrição inválidos.' });
    }
    try {
        const notas = await sql`
            UPDATE diario SET descricao = ${descricao.trim()}
            WHERE id_diario = ${Number(id_diario)} AND id_usuario = ${req.id_usuario_logado}
            RETURNING *
        `;
        if (!notas.length) return res.status(404).json({ erro: 'Registro não encontrado.' });
        return res.json(notas[0]);
    } catch {
        return res.status(500).json({ erro: 'Erro ao atualizar nota.' });
    }
});

router.delete('/diario/:id_diario', async (req, res) => {
    const { id_diario } = req.params;
    if (!idValido(id_diario)) return res.status(400).json({ erro: 'Registro inválido.' });
    try {
        const notas = await sql`DELETE FROM diario WHERE id_diario = ${Number(id_diario)} AND id_usuario = ${req.id_usuario_logado} RETURNING id_diario`;
        if (!notas.length) return res.status(404).json({ erro: 'Registro não encontrado.' });
        return res.json({ mensagem: 'Nota excluída com sucesso!' });
    } catch {
        return res.status(500).json({ erro: 'Erro ao excluir nota.' });
    }
});

export default router;
