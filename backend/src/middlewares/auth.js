import jwt from 'jsonwebtoken';

export default function verificarToken(req, res, next) {
    const cabecalho = req.headers.authorization;
    const token = typeof cabecalho === 'string' ? cabecalho.match(/^Bearer ([^\s]+)$/i)?.[1] : null;

    if (!token) {
        return res.status(401).json({ erro: 'Acesso negado! Informe um token Bearer válido.' });
    }

    try {
        // Aceita somente tokens emitidos para esta API e para este aplicativo.
        const dados = jwt.verify(token, process.env.JWT_SECRET, {
            algorithms: ['HS256'],
            issuer: 'amparo-api',
            audience: 'amparo-app',
        });

        if (!Number.isSafeInteger(dados.id_usuario) || dados.id_usuario <= 0 || !Number.isInteger(dados.exp)) {
            return res.status(401).json({ erro: 'Acesso negado! Token inválido ou expirado.' });
        }

        req.id_usuario_logado = dados.id_usuario;

        return next();
    } catch {
        return res.status(401).json({ erro: 'Acesso negado! Token inválido ou expirado.' });
    }
}
