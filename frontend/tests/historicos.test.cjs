const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createHash } = require('node:crypto');

const emocao = { id: 'antiga-1', emotionKey: 'feliz', emotionTitle: 'Feliz', date: '2025-09-03T02:30:00.123Z' };
const sono = { id: '2025-09-02', date: '2025-09-02', sleepTime: '22:30', wakeTime: '06:30', durationMinutes: 480 };
const nota = { id: '1756866600123', text: 'Texto completo\nSegunda linha', date: '02/09/2025' };
const copia = (valor) => JSON.parse(JSON.stringify(valor));

async function preparar(iniciais = {}) {
    const dados = new Map(Object.entries(iniciais).map(([chave, valor]) => [chave, JSON.stringify(valor)]));
    const pedidos = [];
    const recibos = new Map();
    const leituras = [];
    let conta = 7;
    let interceptar;
    const api = {
        defaults: { headers: { common: { Authorization: 'Bearer 7' } } },
        async post(rota, body, config) {
            assert.equal(rota, '/historicos/importar');
            pedidos.push({ body: copia(body), autorizacao: config.headers.Authorization });
            if (interceptar) return interceptar(body, config);
            const chave = config.headers.Authorization + body.tipo + body.chave;
            const recibo = recibos.get(chave) || { tipo: body.tipo, chave: body.chave, situacao: 'importado', registro: recibos.size + 1 };
            recibos.set(chave, recibo);
            return { data: recibo };
        },
    };
    const storage = {
        async getItem(chave) { leituras.push(chave); return dados.get(chave) || null; },
        async setItem(chave, valor) { dados.set(chave, valor); },
    };
    async function carregar() {
        const contexto = vm.createContext({ console });
        const modulo = new vm.SourceTextModule(fs.readFileSync(path.join(__dirname, '../src/services/historicos.js'), 'utf8'), { context: contexto });
        const imports = {
            '@react-native-async-storage/async-storage': { default: storage },
            'expo-crypto': { CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
                digestStringAsync: async (_, texto) => createHash('sha256').update(texto).digest('hex') },
            'jwt-decode': { jwtDecode: (token) => ({ id_usuario: Number(token), exp: Date.now() / 1000 + 3600 }) },
            './api': { default: api },
            '../utils/sono': { calcularDuracao: (inicio, fim) => {
                const hora = /^([01]\d|2[0-3]):[0-5]\d$/;
                return hora.test(inicio) && hora.test(fim) && inicio !== fim ? 480 : null;
            } },
        };
        await modulo.link((specifier) => {
            assert.ok(specifier in imports);
            const namespace = imports[specifier];
            return new vm.SyntheticModule(Object.keys(namespace), function () {
                for (const [chave, valor] of Object.entries(namespace)) this.setExport(chave, valor);
            }, { context: contexto });
        });
        await modulo.evaluate();
        return modulo.namespace;
    }
    return { dados, pedidos, recibos, leituras, storage, api, carregar,
        service: await carregar(),
        mudarConta(id) { conta = id; api.defaults.headers.common.Authorization = 'Bearer ' + conta; },
        interceptar(callback) { interceptar = callback; },
    };
}

test('importa registros da conta, mantém os originais e não repete após reiniciar', async () => {
    const a = await preparar({ '@amparo/emocoes:7': [emocao], '@amparo/sono:7': [sono], '@amparo/diario:7': [nota] });
    const originais = new Map(a.dados);
    assert.equal((await a.service.sincronizarHistoricosAntigos(7)).importados, 3);
    assert.equal(a.pedidos[0].body.dados.registrado_em, emocao.date);
    assert.equal(a.pedidos[2].body.dados.registrado_em, new Date(Number(nota.id)).toISOString());
    assert.equal(a.pedidos[2].body.dados.descricao, nota.text);
    for (const [chave, valor] of originais) assert.equal(a.dados.get(chave), valor);
    const leiturasIniciais = a.leituras.length;
    await a.service.sincronizarHistoricosAntigos(7);
    assert.equal(a.leituras.length, leiturasIniciais);
    await (await a.carregar()).sincronizarHistoricosAntigos(7);
    assert.equal(a.pedidos.length, 3);
});

test('arquivos globais são vinculados automaticamente uma vez à conta autenticada, incluindo o sono mais antigo', async () => {
    const a = await preparar({ '@amparo/emocoes': [emocao], '@amparo:registros_sono': [sono], '@amparo/diario': [nota] });
    assert.equal((await a.service.sincronizarHistoricosAntigos(7)).importados, 3);
    a.mudarConta(8);
    const outra = await (await a.carregar()).sincronizarHistoricosAntigos(8);
    assert.equal(outra.itens.length, 0);
    assert.equal(a.pedidos.length, 3);
});

test('cópias entre fontes e IDs repetidos não duplicam; confirmações distintas continuam distintas', async () => {
    const a = await preparar({ '@amparo/emocoes:7': [emocao, emocao, { ...emocao, id: 'antiga-2' }],
        '@amparo/emocoes': [emocao], '@amparo/sono:7': [sono], '@amparo:registros_sono': [sono] });
    assert.equal((await a.service.sincronizarHistoricosAntigos(7)).importados, 3);
    a.mudarConta(8);
    assert.equal((await a.service.sincronizarHistoricosAntigos(8)).itens.length, 0);
});

test('falha de conexão ou resposta perdida preserva a fila e compartilha sincronizações concorrentes', async () => {
    const a = await preparar({ '@amparo/emocoes:7': [emocao] });
    let confirmar;
    a.interceptar(() => new Promise((_, rejeitar) => { confirmar = rejeitar; }));
    const primeira = a.service.sincronizarHistoricosAntigos(7);
    assert.equal(primeira, a.service.sincronizarHistoricosAntigos(7));
    await new Promise((resolve) => setImmediate(resolve));
    confirmar(new Error('Conexão perdida'));
    await assert.rejects(primeira, /perdida/);
    const leiturasAntesDaRepeticao = a.leituras.length;
    await assert.rejects(a.service.sincronizarHistoricosAntigos(7), /perdida/);
    assert.equal(a.leituras.length, leiturasAntesDaRepeticao);
    a.interceptar(null);
    assert.equal((await (await a.carregar()).sincronizarHistoricosAntigos(7)).importados, 1);
    assert.equal(a.pedidos[0].body.chave, a.pedidos[1].body.chave);
});

test('uma troca de conta durante o envio não usa a nova credencial para enviar o histórico anterior', async () => {
    const a = await preparar({ '@amparo/emocoes:7': [emocao, { ...emocao, id: 'segunda' }] });
    let concluir;
    a.interceptar((body) => new Promise((resolve) => {
        concluir = () => resolve({ data: { ...body, situacao: 'importado', registro: 1 } });
    }));
    const tarefa = a.service.sincronizarHistoricosAntigos(7);
    await new Promise((resolve) => setImmediate(resolve));
    a.mudarConta(8);
    concluir();
    await assert.rejects(tarefa, /Entre novamente/);
    assert.equal(a.pedidos.length, 1);
    assert.equal(a.pedidos[0].autorizacao, 'Bearer 7');
    const recibosConfirmados = JSON.parse(a.dados.get('@amparo/importacao-recibos:v1:7'));
    assert.equal(Object.keys(recibosConfirmados).length, 1);
    assert.equal((await a.service.sincronizarHistoricosAntigos(8)).itens.length, 0);
});

test('dados incompletos e arquivos ilegíveis não impedem os registros válidos nem são apagados', async () => {
    const a = await preparar({ '@amparo/emocoes:7': [null, { emotionKey: 'feliz' }, emocao],
        '@amparo/diario:7': [{ text: 'Somente a data', date: '02/09/2025' }] });
    a.dados.set('@amparo/sono:7', '{arquivo quebrado');
    const resumo = await a.service.sincronizarHistoricosAntigos(7);
    assert.equal(resumo.importados, 2);
    assert.equal(resumo.invalidos, 3);
    assert.equal(a.dados.get('@amparo/sono:7'), '{arquivo quebrado');
    assert.equal(a.pedidos[1].body.dados.dia, '2025-09-02');
});

test('conflitos e rejeições são registrados internamente sem bloquear os demais ou sobrescrever originais', async () => {
    const a = await preparar({ '@amparo/sono:7': [sono], '@amparo/emocoes:7': [emocao] });
    a.interceptar(async (body) => {
        if (body.tipo === 'emocoes') throw { response: { status: 400 } };
        return { data: { ...body, situacao: 'conflito', registro: 1 } };
    });
    const resumo = await a.service.sincronizarHistoricosAntigos(7);
    assert.equal(resumo.conflitos, 1);
    assert.equal(resumo.invalidos, 1);
    assert.equal(resumo.pendentes, 0);
    await a.service.sincronizarHistoricosAntigos(7);
    assert.equal(a.pedidos.length, 2);
    assert.deepEqual(JSON.parse(a.dados.get('@amparo/sono:7')), [sono]);
});

test('controle corrompido e falha ao salvar recibo não apagam dados nem permitem importação incerta', async () => {
    const a = await preparar({ '@amparo/emocoes:7': [emocao] });
    const salvar = a.storage.setItem;
    a.storage.setItem = async (chave, valor) => {
        if (chave.includes('recibos')) throw new Error('Disco indisponível');
        return salvar(chave, valor);
    };
    await assert.rejects(a.service.sincronizarHistoricosAntigos(7), /Disco/);
    a.storage.setItem = salvar;
    assert.equal((await (await a.carregar()).sincronizarHistoricosAntigos(7)).importados, 1);
    assert.equal(a.recibos.size, 1);
    a.dados.set('@amparo/importacao-proprietarios:v1', '[]');
    await assert.rejects((await a.carregar()).sincronizarHistoricosAntigos(7), /originais/);
});

test('uma única busca importa todo o histórico, inclusive com mais de cinquenta registros', async () => {
    const lista = Array.from({ length: 53 }, (_, indice) => ({ ...emocao, id: 'antiga-' + indice }));
    const a = await preparar({ '@amparo/emocoes:7': lista });
    const primeiro = await a.service.sincronizarHistoricosAntigos(7);
    assert.equal(primeiro.importados, 53);
    assert.equal(primeiro.pendentes, 0);
    const leiturasIniciais = a.leituras.length;
    const segundo = await a.service.sincronizarHistoricosAntigos(7);
    assert.equal(segundo.importados, 53);
    assert.equal(segundo.pendentes, 0);
    assert.equal(a.pedidos.length, 53);
    assert.equal(a.leituras.length, leiturasIniciais);
});

test('o mesmo registro sem ID em chaves distintas mantém uma identidade única', async () => {
    const semId = { ...sono };
    delete semId.id;
    const a = await preparar({ '@amparo/sono:7': [semId], '@amparo:registros_sono': [semId] });
    assert.equal((await a.service.sincronizarHistoricosAntigos(7)).importados, 1);
    assert.equal(a.pedidos.length, 1);
    assert.equal((await (await a.carregar()).sincronizarHistoricosAntigos(7)).importados, 1);
});

test('uma credencial alheia ou um dono explícito diferente nunca inicia a importação para a conta atual', async () => {
    const a = await preparar({ '@amparo/emocoes': [{ ...emocao, id_usuario: 8 }] });
    assert.equal((await a.service.sincronizarHistoricosAntigos(7)).importados, 0);
    assert.equal(a.pedidos.length, 0);
    const b = await preparar({ '@amparo/emocoes': [emocao] });
    b.mudarConta(8);
    await assert.rejects(b.service.sincronizarHistoricosAntigos(7), /Entre novamente/);
    assert.equal(b.leituras.length, 0);
    assert.equal(b.pedidos.length, 0);
});
