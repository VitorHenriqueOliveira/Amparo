import express from 'express';
import { randomUUID } from 'node:crypto';
import { rateLimit } from 'express-rate-limit';
import sql from '../db.js';
import verificarToken from '../middlewares/auth.js';

const router = express.Router();
const tipos = ['emocao', 'diario', 'sono'];
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const tokenExpo = /^(ExpoPushToken|ExponentPushToken)\[[A-Za-z0-9_-]{10,200}\]$/;

function camposValidos(body, campos) {
    return body && typeof body === 'object' && !Array.isArray(body) &&
        Object.keys(body).length === campos.length && Object.keys(body).every((campo) => campos.includes(campo));
}

router.use('/notificacoes', verificarToken, rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 120,
    keyGenerator: (req) => String(req.id_usuario_logado),
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { erro: 'Muitas alterações de notificações. Aguarde e tente novamente.' },
}));

router.put('/notificacoes/dispositivos', async (req, res) => {
    const body = req.body;

    if (!camposValidos(body, ['id_instalacao', 'expo_token', 'permissao']) ||
        typeof body.id_instalacao !== 'string' || !uuid.test(body.id_instalacao) ||
        typeof body.expo_token !== 'string' || !tokenExpo.test(body.expo_token) || typeof body.permissao !== 'boolean') {
        return res.status(400).json({ erro: 'Informe a instalação, o token Expo e a permissão de notificações válidos.' });
    }

    try {
        const dispositivos = await sql`
            INSERT INTO notificacao_dispositivo (id_instalacao, id_usuario, expo_token, permissao, st_ativo, versao)
            SELECT ${body.id_instalacao}, id_usuario, ${body.expo_token}, ${body.permissao}, ${body.permissao}, ${randomUUID()}
            FROM usuario WHERE id_usuario = ${req.id_usuario_logado}
            ON CONFLICT (id_instalacao) DO UPDATE SET id_usuario = EXCLUDED.id_usuario,
                expo_token = EXCLUDED.expo_token, permissao = EXCLUDED.permissao, st_ativo = EXCLUDED.st_ativo,
                versao = CASE WHEN notificacao_dispositivo.id_usuario <> EXCLUDED.id_usuario
                    OR notificacao_dispositivo.expo_token <> EXCLUDED.expo_token
                    OR notificacao_dispositivo.permissao <> EXCLUDED.permissao
                    OR notificacao_dispositivo.st_ativo <> EXCLUDED.st_ativo
                    THEN EXCLUDED.versao ELSE notificacao_dispositivo.versao END,
                atualizado_em = statement_timestamp()
            RETURNING id_instalacao, permissao, st_ativo
        `;

        if (!dispositivos.length) return res.status(401).json({ erro: 'Sessão inválida.' });

        return res.json({ dispositivo: dispositivos[0] });
    } catch (error) {
        if (error.code === '23505') {
            return res.status(409).json({ erro: 'O token já está vinculado a outra instalação.' });
        }

        return res.status(500).json({ erro: 'Não foi possível registrar o dispositivo.' });
    }
});

// Deve ser chamada antes de descartar a sessão no logout ou trocar de conta.
router.delete('/notificacoes/dispositivos/:id', async (req, res) => {
    if (!uuid.test(req.params.id)) return res.status(400).json({ erro: 'Informe uma instalação válida.' });

    try {
        await sql`
            UPDATE notificacao_dispositivo SET st_ativo = FALSE, permissao = FALSE,
                versao = ${randomUUID()}, atualizado_em = statement_timestamp()
            WHERE id_instalacao = ${req.params.id} AND id_usuario = ${req.id_usuario_logado}
        `;

        return res.status(204).end();
    } catch {
        return res.status(500).json({ erro: 'Não foi possível desvincular o dispositivo.' });
    }
});

router.get('/notificacoes/lembretes', async (req, res) => {
    try {
        const usuarios = await sql`SELECT st_notificacao FROM usuario WHERE id_usuario = ${req.id_usuario_logado}`;

        if (!usuarios.length) return res.status(401).json({ erro: 'Sessão inválida.' });

        const lembretes = await sql`
            SELECT tipo, to_char(horario, 'HH24:MI') AS horario, fuso_horario, st_ativo
            FROM notificacao_lembrete WHERE id_usuario = ${req.id_usuario_logado} ORDER BY tipo
        `;

        return res.json({ st_notificacao: usuarios[0].st_notificacao, lembretes });
    } catch {
        return res.status(500).json({ erro: 'Não foi possível consultar os lembretes.' });
    }
});

router.put('/notificacoes/lembretes/:tipo', async (req, res) => {
    const body = req.body;

    if (!tipos.includes(req.params.tipo) || !camposValidos(body, ['horario', 'fuso_horario', 'st_ativo']) ||
        typeof body.horario !== 'string' || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(body.horario) ||
        typeof body.fuso_horario !== 'string' || body.fuso_horario.length > 100 || typeof body.st_ativo !== 'boolean') {
        return res.status(400).json({ erro: 'Informe o tipo, um horário HH:mm, o fuso e a ativação do lembrete.' });
    }

    try {
        const usuarios = await sql`
            SELECT id_usuario, EXISTS (SELECT 1 FROM pg_timezone_names WHERE name = ${body.fuso_horario}) AS fuso_valido
            FROM usuario WHERE id_usuario = ${req.id_usuario_logado}
        `;

        if (!usuarios.length) return res.status(401).json({ erro: 'Sessão inválida.' });
        if (!usuarios[0].fuso_valido) return res.status(400).json({ erro: 'Informe um fuso horário válido, como America/Sao_Paulo.' });

        const lembretes = await sql`
            INSERT INTO notificacao_lembrete (id_usuario, tipo, horario, fuso_horario, st_ativo)
            VALUES (${req.id_usuario_logado}, ${req.params.tipo}, ${body.horario}, ${body.fuso_horario}, ${body.st_ativo})
            ON CONFLICT (id_usuario, tipo) DO UPDATE SET horario = EXCLUDED.horario,
                fuso_horario = EXCLUDED.fuso_horario, st_ativo = EXCLUDED.st_ativo, atualizado_em = statement_timestamp()
            RETURNING tipo, to_char(horario, 'HH24:MI') AS horario, fuso_horario, st_ativo
        `;

        return res.json({ lembrete: lembretes[0] });
    } catch {
        return res.status(500).json({ erro: 'Não foi possível salvar o lembrete.' });
    }
});

export default router;
