const { isIP } = require('node:net');

function validarEnderecoApi(endereco) {
    let url;

    try {
        url = new URL(endereco);
    } catch {
        throw new Error('Defina EXPO_PUBLIC_API_URL com o endereço HTTPS da API hospedada.');
    }

    const host = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
    const hostLocal = host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local');

    if (url.protocol !== 'https:' || hostLocal || isIP(host) ||
        url.username || url.password || url.search || url.hash) {
        throw new Error('EXPO_PUBLIC_API_URL deve usar um domínio HTTPS público, sem credenciais, parâmetros ou fragmentos.');
    }
}

if (require.main === module) {
    if (process.env.EAS_BUILD_PROFILE !== 'development') {
        validarEnderecoApi(process.env.EXPO_PUBLIC_API_URL);
    }

    console.log('Configuração da API verificada para a build.');
}

module.exports = { validarEnderecoApi };
