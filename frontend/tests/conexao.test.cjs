const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const http = require('node:http');
const axios = require('axios');

const estabilizar = () => new Promise((resolve) => setImmediate(resolve));

async function preparar({ env = {}, dev = true } = {}) {
    const temporizadores = new Map();
    let proximo = 0;
    const contexto = vm.createContext({
        process: { env }, __DEV__: dev,
        setTimeout(callback, atraso) {
            assert.equal(atraso, 5000);
            const id = ++proximo;
            temporizadores.set(id, callback);
            return id;
        },
        clearTimeout: (id) => temporizadores.delete(id),
    });
    const modulo = new vm.SourceTextModule(fs.readFileSync(path.join(__dirname, '../src/services/api.js'), 'utf8'), { context: contexto });
    await modulo.link((specifier) => {
        assert.equal(specifier, 'axios');
        return new vm.SyntheticModule(['default'], function () { this.setExport('default', axios); }, { context: contexto });
    });
    await modulo.evaluate();
    return {
        ...modulo.namespace, temporizadores,
        demorar() {
            for (const [id, callback] of [...temporizadores]) {
                temporizadores.delete(id);
                callback();
            }
        },
    };
}

test('todos os perfis usam 15 segundos, inclusive com a antiga variável de 90 segundos', async () => {
    const eas = require('../eas.json');
    for (const perfil of Object.values(eas.build)) {
        assert.equal(perfil.env?.EXPO_PUBLIC_API_TIMEOUT_MS, undefined);
    }
    for (const dev of [true, false]) {
        for (const valor of [undefined, '90000', '0', 'inválido']) {
            const { default: api } = await preparar({ dev, env: {
                EXPO_PUBLIC_API_URL: 'https://amparo.example.com/api', EXPO_PUBLIC_API_TIMEOUT_MS: valor,
            } });
            assert.equal(api.defaults.timeout, 15000);
        }
    }
});

test('aviso começa após a demora e permanece até concluir todas as solicitações lentas', async () => {
    const conexao = await preparar();
    const api = conexao.default;
    const estados = [];
    const pendentes = [];
    const parar = conexao.observarEsperaConexao((valor) => estados.push(valor));
    api.defaults.adapter = (config) => new Promise((resolve) => {
        pendentes.push(() => resolve({ config, status: 200, data: {}, headers: {} }));
    });
    const primeira = api.get('/perfil');
    const segunda = api.get('/diario/7');
    await estabilizar();
    assert.deepEqual(estados, [false]);
    conexao.demorar();
    assert.deepEqual(estados, [false, true]);
    pendentes[0]();
    await primeira;
    assert.deepEqual(estados, [false, true]);
    pendentes[1]();
    await segunda;
    assert.deepEqual(estados, [false, true, false]);
    assert.equal(conexao.temporizadores.size, 0);
    parar();
});

test('solicitações rápidas e importações silenciosas não mostram aviso', async () => {
    const conexao = await preparar();
    const api = conexao.default;
    const estados = [];
    conexao.observarEsperaConexao((valor) => estados.push(valor));
    api.defaults.adapter = async (config) => ({ config, status: 200, data: {}, headers: {} });
    await api.get('/perfil');
    conexao.demorar();
    api.defaults.adapter = async (config) => {
        assert.equal(conexao.temporizadores.size, 0);
        conexao.demorar();
        return { config, status: 200, data: {}, headers: {} };
    };
    await api.post('/historicos/importar', {}, { silenciosa: true });
    assert.deepEqual(estados, [false]);
});

test('timeout e indisponibilidade não encerram a sessão nem repetem gravações', async () => {
    for (const [codigo, status] of [['ECONNABORTED'], ['ERR_NETWORK'], ['ERR_BAD_RESPONSE', 503]]) {
        const conexao = await preparar();
        const api = conexao.default;
        const estados = [];
        let envios = 0;
        let invalidacoes = 0;
        conexao.observarEsperaConexao((valor) => estados.push(valor));
        conexao.observarFalhaAutenticacao(() => invalidacoes++);
        api.defaults.headers.common.Authorization = 'Bearer teste';
        api.defaults.adapter = async (config) => {
            envios++;
            conexao.demorar();
            throw new axios.AxiosError('Falha simulada', codigo, config, {}, status ? { status } : undefined);
        };
        await assert.rejects(api.post('/diario', { descricao: 'Texto preservado' }));
        assert.equal(envios, 1);
        assert.equal(invalidacoes, 0);
        assert.equal(api.defaults.headers.common.Authorization, 'Bearer teste');
        assert.equal(conexao.temporizadores.size, 0);
        assert.deepEqual(estados, [false, true, false]);
    }
});

test('cancelamento limpa o aviso e os ouvintes podem ser removidos', async () => {
    const conexao = await preparar();
    const estados = [];
    const parar = conexao.observarEsperaConexao((valor) => estados.push(valor));
    const controller = new AbortController();
    conexao.default.defaults.adapter = async (config) => {
        conexao.demorar();
        controller.abort();
        return { config, status: 200, data: {}, headers: {} };
    };
    await assert.rejects(conexao.default.get('/perfil', { signal: controller.signal }), { code: 'ERR_CANCELED' });
    assert.deepEqual(estados, [false, true, false]);
    parar();
    conexao.default.defaults.adapter = async (config) => {
        conexao.demorar();
        return { config, status: 200, data: {}, headers: {} };
    };
    await conexao.default.get('/perfil');
    assert.deepEqual(estados, [false, true, false]);
});

test('mensagens distinguem demora, falta de conexão e erros de acesso ou validação', async () => {
    const { mensagemFalhaConexao: mensagem } = await preparar();
    for (const erro of [{ code: 'ECONNABORTED' }, { code: 'ETIMEDOUT' },
        ...[502, 503, 504].map((status) => ({ response: { status } }))]) {
        assert.match(mensagem(erro, 'Alternativa'), /primeiro acesso.*um minuto.*tentar novamente/);
    }
    assert.match(mensagem({ code: 'ERR_NETWORK' }), /Verifique sua conexão/);
    assert.match(mensagem({ request: {} }), /Verifique sua conexão/);
    for (const erro of [{ response: { status: 401 } }, { response: { status: 400 } },
        { response: { status: 429 } }, { code: 'ERR_CANCELED' }, new Error('Validação')]) {
        assert.equal(mensagem(erro, 'Mensagem da operação'), 'Mensagem da operação');
    }
});

test('uma API sem resposta é interrompida em 15 segundos sem repetir o POST', { timeout: 20000 }, async () => {
    let envios = 0;
    const servidor = http.createServer(() => { envios++; });
    await new Promise((resolve) => servidor.listen(0, '127.0.0.1', resolve));
    try {
        const { default: api } = await preparar();
        const inicio = Date.now();
        await assert.rejects(api.post('http://127.0.0.1:' + servidor.address().port + '/login', {}), { code: 'ECONNABORTED' });
        const duracao = Date.now() - inicio;
        assert.ok(duracao >= 14500 && duracao < 19000, 'A tentativa deve terminar perto de 15 segundos.');
        assert.equal(envios, 1);
    } finally {
        servidor.closeAllConnections();
        await new Promise((resolve) => servidor.close(resolve));
    }
});
