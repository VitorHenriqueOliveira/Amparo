import axios from 'axios';

const enderecoApi = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

// Dados de acesso só podem trafegar por HTTPS no aplicativo de produção.
if (!__DEV__ && !enderecoApi.startsWith('https://')) {
    throw new Error('Configure EXPO_PUBLIC_API_URL com HTTPS para executar em produção.');
}

const api = axios.create({
    baseURL: enderecoApi,
    // O mesmo limite vale para desenvolvimento, teste e produção.
    timeout: 15000,
});

const ouvintes = new Set();
const ouvintesEspera = new Set();
const requisicoes = new Map();
let esperando = false;

function atualizarEspera() {
    const atual = [...requisicoes.values()].some((requisicao) => requisicao.demorando);

    if (atual === esperando) return;
    esperando = atual;

    for (const callback of ouvintesEspera) {
        callback(atual);
    }
}

export function observarEsperaConexao(callback) {
    ouvintesEspera.add(callback);
    callback(esperando);

    return () => ouvintesEspera.delete(callback);
}

export function mensagemFalhaConexao(erro, alternativa) {
    if (['ECONNABORTED', 'ETIMEDOUT'].includes(erro?.code) ||
        [502, 503, 504].includes(erro?.response?.status)) {
        return 'A conexão está demorando. No primeiro acesso, pode ser preciso aguardar cerca de um minuto e tentar novamente.';
    }

    if (!erro?.response && (erro?.request || erro?.code === 'ERR_NETWORK')) {
        return 'Não foi possível conectar. Verifique sua conexão e tente novamente.';
    }

    return alternativa;
}

function concluirEspera(config) {
    const requisicao = requisicoes.get(config);

    if (!requisicao) return;
    clearTimeout(requisicao.temporizador);
    requisicoes.delete(config);
    atualizarEspera();
}

api.interceptors.request.use((config) => {
    if (config.silenciosa) return config;
    const requisicao = { demorando: false };

    requisicao.temporizador = setTimeout(() => {
        requisicao.demorando = true;
        atualizarEspera();
    }, 5000);
    requisicoes.set(config, requisicao);

    return config;
});

export function observarFalhaAutenticacao(callback) {
    ouvintes.add(callback);

    return () => ouvintes.delete(callback);
}

api.interceptors.response.use(
    (resposta) => {
        concluirEspera(resposta.config);

        return resposta;
    },
    (erro) => {
        concluirEspera(erro.config);
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
