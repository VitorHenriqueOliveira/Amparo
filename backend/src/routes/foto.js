import express from 'express';
import { rateLimit } from 'express-rate-limit';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import sql from '../db.js';
import verificarToken from '../middlewares/auth.js';

const router = express.Router();
const formatos = { 'image/jpeg': 'jpeg', 'image/png': 'png', 'image/webp': 'webp' };
const limitarEnvios = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 20,
    keyGenerator: (req) => String(req.id_usuario_logado),
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { erro: 'Muitas alterações de foto. Aguarde e tente novamente.' },
});

router.put('/perfil/foto', verificarToken, limitarEnvios, (req, res, next) => {
    if (!Object.hasOwn(formatos, req.get('Content-Type') || '')) {
        return res.status(415).json({ erro: 'Envie uma imagem JPEG, PNG ou WebP.' });
    }

    return next();
}, express.raw({ type: Object.keys(formatos), limit: '2mb', inflate: false }), async (req, res) => {
    if (Object.keys(req.query).length || !Buffer.isBuffer(req.body) || !req.body.length) {
        return res.status(400).json({ erro: 'Envie somente o arquivo da foto.' });
    }

    let foto;

    try {
        const imagem = sharp(req.body, { limitInputPixels: 16000000, failOn: 'warning' });
        const metadados = await imagem.metadata();

        if (metadados.format !== formatos[req.get('Content-Type')] || (metadados.pages || 1) !== 1) {
            return res.status(400).json({ erro: 'A imagem está inválida ou possui um formato diferente do informado.' });
        }

        // Reprocessa a imagem inteira e remove EXIF, localização e demais metadados.
        foto = await imagem.rotate().resize(512, 512, { fit: 'inside', withoutEnlargement: true })
            .webp({ quality: 80 }).toBuffer({ resolveWithObject: true });
    } catch {
        return res.status(400).json({ erro: 'Não foi possível ler a imagem. Envie uma foto válida de até 2 MB e 16 milhões de pixels.' });
    }

    if (foto.data.length > 524288) {
        return res.status(400).json({ erro: 'A foto excede o tamanho permitido após o processamento.' });
    }

    const versao = createHash('sha256').update(foto.data).digest('hex');

    try {
        // A imagem e sua referência são substituídas em uma única gravação atômica.
        const fotos = await sql`
            INSERT INTO usuario_foto (id_usuario, conteudo, largura, altura, versao)
            SELECT id_usuario, decode(${foto.data.toString('base64')}, 'base64'), ${foto.info.width}, ${foto.info.height}, ${versao}
            FROM usuario WHERE id_usuario = ${req.id_usuario_logado}
            ON CONFLICT (id_usuario) DO UPDATE SET conteudo = EXCLUDED.conteudo,
                largura = EXCLUDED.largura, altura = EXCLUDED.altura, versao = EXCLUDED.versao,
                atualizado_em = statement_timestamp()
            RETURNING versao
        `;

        if (!fotos.length) return res.status(401).json({ erro: 'Sessão inválida.' });

        return res.json({ foto_url: '/api/perfil/foto?v=' + fotos[0].versao });
    } catch {
        return res.status(500).json({ erro: 'Não foi possível salvar a foto. Tente novamente.' });
    }
});

router.get('/perfil/foto', verificarToken, async (req, res) => {
    try {
        const usuarios = await sql`
            SELECT encode(f.conteudo, 'base64') AS conteudo, f.tipo_mime
            FROM usuario u LEFT JOIN usuario_foto f ON f.id_usuario = u.id_usuario
            WHERE u.id_usuario = ${req.id_usuario_logado}
        `;

        if (!usuarios.length) return res.status(401).json({ erro: 'Sessão inválida.' });
        if (!usuarios[0].conteudo) return res.status(404).json({ erro: 'Você ainda não adicionou uma foto.' });

        res.setHeader('Content-Type', usuarios[0].tipo_mime);
        res.setHeader('Content-Disposition', 'inline; filename="perfil.webp"');

        return res.send(Buffer.from(usuarios[0].conteudo, 'base64'));
    } catch {
        return res.status(500).json({ erro: 'Não foi possível carregar a foto.' });
    }
});

router.delete('/perfil/foto', verificarToken, async (req, res) => {
    try {
        const usuarios = await sql`
            WITH conta AS (SELECT id_usuario FROM usuario WHERE id_usuario = ${req.id_usuario_logado}),
                removida AS (DELETE FROM usuario_foto WHERE id_usuario IN (SELECT id_usuario FROM conta))
            SELECT id_usuario FROM conta
        `;

        if (!usuarios.length) return res.status(401).json({ erro: 'Sessão inválida.' });

        return res.status(204).end();
    } catch {
        return res.status(500).json({ erro: 'Não foi possível remover a foto.' });
    }
});

export default router;
