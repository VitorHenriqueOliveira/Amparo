import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import sql from '../db.js';
import verificarToken from '../middlewares/auth.js';

const router = express.Router();

// Evita um caminho muito mais rápido para autenticar e-mails inexistentes.
const hashParaUsuarioAusente = bcrypt.hashSync('comparacao-interna-sem-conta', 10);

function emailValido(email) {
    return typeof email === 'string' && email.length <= 150 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function senhaValida(senha, cadastro = false) {
    // O bcrypt considera somente os primeiros 72 bytes da senha.
    return typeof senha === 'string' && senha.length >= (cadastro ? 8 : 1) && Buffer.byteLength(senha) <= 72;
}

// Cadastro: valida os dados antes de consultar ou alterar o banco.
router.post('/usuario', async (req, res) => {
    const { nome, email, senha } = req.body || {};
    const nomeNormalizado = typeof nome === 'string' ? nome.trim() : '';
    const emailNormalizado = typeof email === 'string' ? email.trim().toLowerCase() : '';

    if (!nomeNormalizado || nomeNormalizado.length > 100 || !emailValido(emailNormalizado) || !senhaValida(senha, true)) {
        return res.status(400).json({ erro: 'Informe nome, e-mail e senha válidos. A senha deve ter pelo menos 8 caracteres e no máximo 72 bytes.' });
    }

    try {
        const existentes = await sql`SELECT id_usuario FROM usuario WHERE lower(trim(email)) = ${emailNormalizado}`;

        if (existentes.length > 0) {
            return res.status(409).json({ erro: 'Este e-mail já está em uso.' });
        }

        const hashSenha = await bcrypt.hash(senha, 10);
        const usuarios = await sql`
            INSERT INTO usuario (nome, email, senha)
            VALUES (${nomeNormalizado}, ${emailNormalizado}, ${hashSenha})
            RETURNING id_usuario, nome, email, data_cadastro
        `;

        return res.status(201).json(usuarios[0]);
    } catch (error) {
        // Trata também o conflito detectado pelo banco, quando houver índice único.
        if (error.code === '23505') {
            return res.status(409).json({ erro: 'Este e-mail já está em uso.' });
        }

        console.error('Erro ao cadastrar usuário.');

        return res.status(500).json({ erro: 'Erro interno no servidor.' });
    }
});

// Login: a resposta não informa se o erro foi no e-mail ou na senha.
router.post('/login', async (req, res) => {
    const { email, senha } = req.body || {};
    const emailNormalizado = typeof email === 'string' ? email.trim().toLowerCase() : '';

    if (!emailValido(emailNormalizado) || !senhaValida(senha)) {
        return res.status(400).json({ erro: 'Informe um e-mail e uma senha válidos.' });
    }

    try {
        const usuarios = await sql`
            SELECT id_usuario, nome, email, senha, st_notificacao
            FROM usuario
            WHERE lower(trim(email)) = ${emailNormalizado}
        `;

        const usuario = usuarios[0];
        const senhaCorreta = await bcrypt.compare(senha, usuario?.senha || hashParaUsuarioAusente);

        // Um e-mail duplicado não pode escolher uma conta de forma ambígua.
        if (usuarios.length !== 1 || !senhaCorreta) {
            return res.status(401).json({ erro: 'E-mail ou senha incorretos.' });
        }

        const token = jwt.sign({ id_usuario: usuario.id_usuario }, process.env.JWT_SECRET, {
            algorithm: 'HS256',
            issuer: 'amparo-api',
            audience: 'amparo-app',
            expiresIn: '7d',
        });

        return res.json({
            usuario: { id_usuario: usuario.id_usuario, nome: usuario.nome, email: usuario.email, st_notificacao: usuario.st_notificacao },
            token,
        });
    } catch {
        console.error('Erro ao autenticar usuário.');

        return res.status(500).json({ erro: 'Erro interno no servidor.' });
    }
});

router.put('/perfil', verificarToken, async (req, res) => {
    const nome = typeof req.body?.nome === 'string' ? req.body.nome.trim() : '';

    if (!nome || nome.length > 100 || Object.keys(req.body).some((campo) => campo !== 'nome')) {
        return res.status(400).json({ erro: 'Informe um nome com até 100 caracteres.' });
    }

    try {
        const usuarios = await sql`
            UPDATE usuario SET nome = ${nome}
            WHERE id_usuario = ${req.id_usuario_logado}
            RETURNING id_usuario, nome, email, st_notificacao
        `;

        if (!usuarios.length) return res.status(401).json({ erro: 'Sessão inválida.' });

        return res.json({ usuario: usuarios[0] });
    } catch {
        return res.status(500).json({ erro: 'Não foi possível atualizar o perfil.' });
    }
});

router.put('/perfil/notificacoes', verificarToken, async (req, res) => {
    const notificacoes = req.body?.st_notificacao;

    if (typeof notificacoes !== 'boolean' || Object.keys(req.body).some((campo) => campo !== 'st_notificacao')) {
        return res.status(400).json({ erro: 'Informe se as notificações devem estar ativadas ou desativadas.' });
    }

    try {
        const usuarios = await sql`
            UPDATE usuario SET st_notificacao = ${notificacoes}
            WHERE id_usuario = ${req.id_usuario_logado}
            RETURNING id_usuario, nome, email, st_notificacao
        `;

        if (!usuarios.length) return res.status(401).json({ erro: 'Sessão inválida.' });

        return res.json({ usuario: usuarios[0] });
    } catch {
        return res.status(500).json({ erro: 'Não foi possível atualizar as notificações.' });
    }
});

// O perfil e a sessão consultam exclusivamente a conta identificada pelo JWT.
router.get(['/sessao', '/perfil'], verificarToken, async (req, res) => {
    try {
        const usuarios = await sql`
            SELECT id_usuario, nome, email, st_notificacao
            FROM usuario
            WHERE id_usuario = ${req.id_usuario_logado}
        `;

        if (!usuarios.length) {
            return res.status(401).json({ erro: 'Sessão inválida.' });
        }

        const usuario = usuarios[0];

        return res.json({
            usuario: { id_usuario: usuario.id_usuario, nome: usuario.nome, email: usuario.email, st_notificacao: usuario.st_notificacao },
        });
    } catch {
        console.error('Erro ao verificar sessão.');

        return res.status(500).json({ erro: 'Não foi possível verificar a sessão.' });
    }
});

export default router;
