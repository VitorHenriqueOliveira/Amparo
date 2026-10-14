import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import rotasUsuario from './routes/usuario.js';
import rotasDiario from './routes/diario.js';
import rotasCalma from './routes/calma.js';

// Separa a configuração da API da abertura da porta para permitir testes.
export function criarApp({ origensPermitidas, proxiesConfiaveis = 0 }) {
    const app = express();

    app.set('trust proxy', proxiesConfiaveis);
    app.disable('x-powered-by');
    app.use(helmet());

    app.use(cors({
        origin(origem, callback) {
            // Aplicativos nativos não enviam Origin; navegadores precisam estar na lista.
            if (!origem || origensPermitidas.includes(origem)) {
                return callback(null, true);
            }

            const erro = new Error('Origem não permitida.');
            erro.status = 403;

            return callback(erro);
        },
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        allowedHeaders: ['Content-Type', 'Authorization'],
    }));

    app.use('/api', (req, res, next) => {
        // Respostas privadas e tokens não devem ser guardados em caches.
        res.setHeader('Cache-Control', 'no-store');
        next();
    });

    // Os limites são separados por IP, sem registrar senhas ou e-mails.
    app.use('/api/login', rateLimit({
        windowMs: 15 * 60 * 1000,
        limit: 10,
        skipSuccessfulRequests: true,
        standardHeaders: 'draft-8',
        legacyHeaders: false,
        message: { erro: 'Muitas tentativas de acesso. Aguarde 15 minutos e tente novamente.' },
    }));

    app.use('/api/usuario', rateLimit({
        windowMs: 60 * 60 * 1000,
        limit: 5,
        standardHeaders: 'draft-8',
        legacyHeaders: false,
        message: { erro: 'Muitas tentativas de cadastro. Aguarde e tente novamente.' },
    }));

    app.use(express.json({ limit: '64kb' }));
    app.use('/api', rotasUsuario);
    app.use('/api', rotasCalma);
    app.use('/api', rotasDiario);

    app.use((req, res) => {
        res.status(404).json({ erro: 'Rota não encontrada.' });
    });

    // Trata erros sem devolver stack ou dados recebidos pelo servidor.
    app.use((error, req, res, next) => {
        if (res.headersSent) {
            return next(error);
        }

        if (error.type === 'entity.too.large') {
            return res.status(413).json({ erro: 'O conteúdo enviado excede o limite permitido.' });
        }

        if (error.type === 'entity.parse.failed') {
            return res.status(400).json({ erro: 'Envie um JSON válido.' });
        }

        if (error.status === 403) {
            return res.status(403).json({ erro: 'Origem não permitida.' });
        }

        console.error('Erro interno na API.');

        return res.status(500).json({ erro: 'Erro interno no servidor.' });
    });

    return app;
}
