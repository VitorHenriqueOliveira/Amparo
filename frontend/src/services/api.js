import axios from 'axios';

const enderecoApi = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

// Dados de acesso só podem trafegar por HTTPS no aplicativo de produção.
if (!__DEV__ && !enderecoApi.startsWith('https://')) {
    throw new Error('Configure EXPO_PUBLIC_API_URL com HTTPS para executar em produção.');
}

const api = axios.create({
    baseURL: enderecoApi,
    timeout: 15000,
});

const ouvintes = new Set();

export function observarFalhaAutenticacao(callback) {
    ouvintes.add(callback);

    return () => ouvintes.delete(callback);
}

api.interceptors.response.use(
    (resposta) => resposta,
    (erro) => {
        const cabecalhos = erro.config?.headers;
        const autorizacao = cabecalhos?.get?.('Authorization') || cabecalhos?.Authorization;
        const rotaPublica = ['/login', '/usuario'].includes(erro.config?.url);

        // Uma resposta antiga não deve encerrar uma sessão iniciada depois dela.
        if (erro.response?.status === 401 && !rotaPublica && autorizacao &&
            autorizacao === api.defaults.headers.common.Authorization) {
            for (const callback of ouvintes) {
                callback();
            }
        }

        return Promise.reject(erro);
    }
);

export default api;
