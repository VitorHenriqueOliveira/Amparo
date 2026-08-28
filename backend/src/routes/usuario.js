import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import sql from '../db.js';

const router = express.Router();

// Rota de Cadastro
router.post('/usuario', async (req, res) => {
  const { nome, email, senha } = req.body;

  try {
    // Verifica se o email já existe
    const usuarioExistente = await sql`SELECT * FROM usuario WHERE email = ${email}`;

    if (usuarioExistente.length > 0) {
      return res.status(400).json({ erro: 'Este e-mail já está em uso.' });
    }

    // Criptografa a senha (10 é o "custo do processamente", padrão de mercado)
    const salt = await bcrypt.genSalt(10);
    const senhaCriptografada = await bcrypt.hash(senha, salt);

    // Salva no NeonDB com a senha criptografada
    const novoUsuario = await sql`INSERT INTO usuario (nome, email, senha) VALUES (${nome}, ${email}, ${senhaCriptografada}) RETURNING id_usuario, nome, email, data_cadastro`;

    // Retorna os dados do usuário recém-criado
    res.status(201).json(novoUsuario[0]);

  } catch (error) {
    console.error('Erro ao cadastrar usuário:', error);
    res.status(500).json({ erro: 'Erro interno no servidor' });
  }
})

// Rota de Login
router.post('/login', async (req, res) => {
  const { email, senha } = req.body;

  try {
    // Busca na tabela 'usuario' se existe alguém com esse e-mail e senha
    const usuario = await sql`
      SELECT id_usuario, nome, email, senha
      FROM usuario 
      WHERE email = ${email}
    `;

    // Se o array retornar vazio, as credenciais estão erradas
    if (usuario.length === 0) {
      res.status(401).json({ erro: 'E-mail ou senha incorretos' });
    }

    // Comparar a senha digitada com a senha criptografada do banco
    const senhaValida = await bcrypt.compare(senha, usuario[0].senha);

    if (!senhaValida) {
      return res.status(401).json({ erro: 'E-mail ou senha incorretos' });
    }

    // Criar um id para o usuário que vai valer por 7 dias
    const token = jwt.sign(
      { id_usuario: usuario[0].id_usuario },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Se tude estiver certo, remove a senha dos dados antes de devolver pro app
    const dadosUsuario = {
      id_usuario: usuario[0].id_usuario,
      nome: usuario[0].nome,
      email: usuario[0].email
    };

    res.status(200).json({usuario: dadosUsuario, token: token});

  } catch (error) {
    console.error('Erro no backend de login:', error);
    res.status(500).json({ erro: 'Erro interno no servidor' });
  }
});

export default router;

/*

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
*/