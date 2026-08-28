import express from 'express';
import sql from '../db.js';

const router = express.Router();

// Rota para validar o Login
router.post('/login', async (req, res) => {
  const { email, senha } = req.body;

  try {
    // Busca na tabela 'usuario' se existe alguém com esse e-mail e senha
    const usuario = await sql`
      SELECT id_usuario, nome, email 
      FROM usuario 
      WHERE email = ${email} AND senha = ${senha}
    `;

    // Se o array retornou algo, o usuário existe!
    if (usuario.length > 0) {
      res.status(200).json(usuario[0]); // Retorna os dados (sem a senha, por segurança)
    } else {
      // Se retornou vazio, credenciais estão erradas
      res.status(401).json({ erro: 'E-mail ou senha incorretos' });
    }
  } catch (error) {
    console.error('Erro no backend de login:', error);
    res.status(500).json({ erro: 'Erro interno no servidor' });
  }
});

export default router;