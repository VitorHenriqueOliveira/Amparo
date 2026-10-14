// Valida a configuração sem mostrar valores de credenciais nas mensagens.
export function validarAmbiente(variaveis = process.env) {
    const ambiente = variaveis.NODE_ENV || 'development';
    const porta = Number(variaveis.PORT || 3000);
    const proxiesConfiaveis = Number(variaveis.TRUST_PROXY_HOPS || 0);

    if (!['development', 'test', 'production'].includes(ambiente)) {
        throw new Error('NODE_ENV deve ser development, test ou production.');
    }

    try {
        const conexao = new URL(variaveis.DATABASE_URL);

        if (!['postgres:', 'postgresql:'].includes(conexao.protocol)) {
            throw new Error();
        }
    } catch {
        throw new Error('DATABASE_URL deve conter uma conexão PostgreSQL válida.');
    }

    if (typeof variaveis.JWT_SECRET !== 'string' || Buffer.byteLength(variaveis.JWT_SECRET.trim()) < 32) {
        throw new Error('JWT_SECRET deve conter um segredo aleatório com pelo menos 32 bytes.');
    }

    if (!Number.isInteger(porta) || porta < 1 || porta > 65535) {
        throw new Error('PORT deve ser uma porta válida.');
    }

    if (!Number.isInteger(proxiesConfiaveis) || proxiesConfiaveis < 0 || proxiesConfiaveis > 10) {
        throw new Error('TRUST_PROXY_HOPS deve ser um número entre 0 e 10.');
    }

    const origensConfiguradas = variaveis.CORS_ORIGINS ||
        (ambiente === 'production' ? '' : 'http://localhost:8081,http://127.0.0.1:8081');

    const origensPermitidas = origensConfiguradas.split(',').map((origem) => origem.trim()).filter(Boolean);

    if (ambiente === 'production' && origensPermitidas.length === 0) {
        throw new Error('Configure CORS_ORIGINS antes de executar em produção.');
    }

    for (const origem of origensPermitidas) {
        try {
            const url = new URL(origem);
            const protocolos = ambiente === 'production' ? ['https:'] : ['http:', 'https:'];

            if (!protocolos.includes(url.protocol) || url.origin !== origem) {
                throw new Error();
            }
        } catch {
            throw new Error('CORS_ORIGINS deve conter origens explícitas; em produção, use HTTPS.');
        }
    }

    return {
        porta,
        proxiesConfiaveis,
        origensPermitidas,
        databaseUrl: variaveis.DATABASE_URL,
    };
}
