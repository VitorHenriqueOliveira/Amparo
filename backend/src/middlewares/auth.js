import jwt from 'jsonwebtoken';

export default function verificarToken(req, res, next) {
    // O app envia o crachá escondido no "cabeçalho" (header) da requisição
    const authHeader = req.headers.authorization;

    // Se não tem token, é impedido de entrar
    if (!authHeader) {
        return res.status(401).json({ erro: 'Acesso negado! Token não fornecido.'});
    }

    // Cortar o "Bearer .." do padrão do token
    const [, token] = authHeader.split(' ');

    try {
        // Verifica se o token é falso
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Se for verdadeiro, salva o token
        req.id_usuario_logado = decoded.id_usuario;

        // Permite o uso do aplitavo
        return next();
    } catch (error) {
        // Se o token for falso o se passou de 7 dias
        return res.status(401).json({ erro: 'Acesso negado! Token inválido ou expirado' });
    }
}