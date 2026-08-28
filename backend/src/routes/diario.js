import express from 'express';
import sql from '../db.js';
import verificarToken from '../middlewares/auth.js';

const router = express.Router();

// Garantir que todas as rotas exigam o token
router.use(verificarToken);

// 1. Buscar notas (GET)
router.get('/diario/:id_usuario', async (req, res) => {
    const { id_usuario } = req.params;

    // Verifica se o usuário que está pedindo as notas é o mesmo do token acima
    if (parseInt(id_usuario) !== req.id_usuario_logado) {
        return res.status(403).json({ erro: 'Você nmão tem permissão para ver as notas de outro usuário.' });
    }

    try {
        const notas = await sql`SELECT id_diario, descricao, data_registro FROM diario WHERE id_usuario = ${id_usuario} ORDER BY data_registro DESC`;
        res.json(notas);
    } catch (error) {
        res.status(500).json({ erro: 'Erro ao buscar notas' });
    }
});

// 2. Criar nota (POST)
router.post('/diario', async (req, res) => {
    const { id_usuario, descricao } = req.body;
    try {
        const novaNota = await sql`INSERT INTO diario (id_usuario, descricao) VALUES (${id_usuario}, ${descricao}) RETURNING *`;
        res.status(201).json(novaNota[0]);
    } catch (error) {
        res.status(500).json({ erro: 'Erro ao criar nota' });
    }
});

// 3. Editar nota (PUT)
router.put('/diario/:id_diario', async (req, res) => {
    const { id_diario } = req.params;
    const { descricao } = req.body;
    try {
        const notaAtualizada = await sql`
      UPDATE diario 
      SET descricao = ${descricao} 
      WHERE id_diario = ${id_diario} 
      RETURNING *
    `;
        res.json(notaAtualizada[0]);
    } catch (error) {
        res.status(500).json({ erro: 'Erro ao atualizar nota' });
    }
});

// 4. Excluir nota (DELETE)
router.delete('/diario/:id_diario', async (req, res) => {
    const { id_diario } = req.params;
    try {
        await sql`DELETE FROM diario WHERE id_diario = ${id_diario}`;
        res.json({ mensagem: 'Nota excluída com sucesso!' });
    } catch (error) {
        res.status(500).json({ erro: 'Erro ao excluir nota' });
    }
});

export default router;