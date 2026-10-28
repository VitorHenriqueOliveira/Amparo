const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const babel = require('@babel/core');

const estabilizar = () => new Promise((resolve) => setImmediate(resolve));

async function preparar({ restaurado = null, sincronizar, restaurar } = {}) {
    const hooks = [];
    const efeitos = [];
    const intervalos = new Set();
    const ouvintes = new Set();
    const importacoes = [];
    let posicao;
    const iguais = (antes, depois) => antes && antes.length === depois.length && antes.every((valor, i) => Object.is(valor, depois[i]));
    const react = {
        createContext: () => ({ Provider: 'Provider' }),
        useState(inicial) {
            const indice = posicao++;
            if (!(indice in hooks)) hooks[indice] = { valor: inicial };
            return [hooks[indice].valor, (valor) => {
                hooks[indice].valor = typeof valor === 'function' ? valor(hooks[indice].valor) : valor;
            }];
        },
        useRef(inicial) { return (hooks[posicao++] ||= { current: inicial }); },
        useCallback(callback, deps) {
            const indice = posicao++;
            if (!iguais(hooks[indice]?.deps, deps)) hooks[indice] = { callback, deps };
            return hooks[indice].callback;
        },
        useEffect(callback, deps) {
            const indice = posicao++;
            if (!iguais(hooks[indice]?.deps, deps)) {
                efeitos.push(() => {
                    hooks[indice]?.limpar?.();
                    hooks[indice] = { deps, limpar: callback() };
                });
            }
        },
    };
    const appState = {
        currentState: 'active',
        addEventListener(_, callback) { ouvintes.add(callback); return { remove: () => ouvintes.delete(callback) }; },
    };
    const jsx = (tipo, props) => ({ tipo, props });
    const mocks = {
        react: { default: react, ...react },
        'react/jsx-runtime': { jsx, jsxs: jsx },
        'react-native': { AppState: appState },
        '../services/api': { observarFalhaAutenticacao: () => () => {}, mensagemFalhaConexao: (_, alternativa) => alternativa },
        '../services/calma': { sincronizarCiclosCalma: async () => {} },
        '../services/historicos': { sincronizarHistoricosAntigos: (id) => {
            importacoes.push(id);
            return sincronizar ? sincronizar(id) : Promise.resolve({ importados: 1 });
        } },
        '../services/usuario': { buscarPerfil() {}, atualizarPerfil() {}, atualizarNotificacoes() {} },
        '../services/sessao': {
            restaurarSessao: restaurar || (async () => restaurado),
            iniciarSessao: async () => {}, encerrarSessao: async () => {}, salvarUsuario: async () => {},
            observarExpiracao: () => () => {}, verificarExpiracao() {},
        },
    };
    const contexto = vm.createContext({ console,
        setInterval: (callback) => { intervalos.add(callback); return callback; },
        clearInterval: (callback) => intervalos.delete(callback),
    });
    const codigo = babel.transformSync(fs.readFileSync(path.join(__dirname, '../src/contexts/AuthContext.js'), 'utf8'), {
        configFile: false, babelrc: false,
        plugins: [[require.resolve('@babel/plugin-transform-react-jsx'), { runtime: 'automatic' }]],
    }).code;
    const modulo = new vm.SourceTextModule(codigo, { context: contexto });
    await modulo.link((specifier) => {
        assert.ok(specifier in mocks);
        const namespace = mocks[specifier];
        return new vm.SyntheticModule(Object.keys(namespace), function () {
            for (const [nome, valor] of Object.entries(namespace)) this.setExport(nome, valor);
        }, { context: contexto });
    });
    await modulo.evaluate();

    function renderizar() {
        posicao = 0;
        const valor = modulo.namespace.AuthProvider({ children: null }).props.value;
        while (efeitos.length) efeitos.shift()();
        return valor;
    }
    const app = {
        renderizar, importacoes,
        async entrar(id) { await renderizar().login({ id_usuario: id, nome: 'Conta de teste' }, 'token-teste'); renderizar(); },
        async sair() { await renderizar().logout(); renderizar(); },
        mudarEstado(estado) { appState.currentState = estado; for (const callback of ouvintes) callback(estado); },
        avancarIntervalos() { for (const callback of intervalos) callback(); },
    };
    renderizar();
    await estabilizar();
    renderizar();
    return app;
}

test('falha de restauração oferece nova tentativa, bloqueia toques duplicados e só abre a conta após confirmar', async () => {
    let tentativas = 0;
    let concluir;
    const app = await preparar({ restaurar: () => {
        if (++tentativas === 1) return Promise.reject({ code: 'ECONNABORTED' });
        return new Promise((resolve) => { concluir = resolve; });
    } });

    assert.equal(app.renderizar().usuario, null);
    assert.equal(app.renderizar().carregando, false);
    assert.ok(app.renderizar().erroRestauracao);
    const repetir = app.renderizar().tentarRestaurarSessao;
    const tentativa = repetir();
    await repetir();
    assert.equal(tentativas, 2);
    assert.equal(app.renderizar().carregando, true);
    assert.equal(app.renderizar().erroRestauracao, '');
    concluir({ id_usuario: 7 });
    await tentativa;
    assert.equal(app.renderizar().usuario.id_usuario, 7);
    assert.equal(app.renderizar().sessaoRestaurada, true);
    assert.equal(app.renderizar().carregando, false);
});

test('após falha de restauração é possível ir ao login sem repetir chamadas', async () => {
    let tentativas = 0;
    const app = await preparar({ restaurar: async () => {
        tentativas++;
        throw new Error('Sem conexão');
    } });

    assert.ok(app.renderizar().erroRestauracao);
    app.renderizar().continuarNoLogin();
    assert.equal(app.renderizar().erroRestauracao, '');
    assert.equal(app.renderizar().carregando, false);
    assert.equal(app.renderizar().usuario, null);
    assert.equal(tentativas, 1);
});

test('resposta atrasada da restauração não reabre uma conta após logout', async () => {
    let concluir;
    const app = await preparar({ restaurar: () => new Promise((resolve) => { concluir = resolve; }) });
    await app.sair();
    concluir({ id_usuario: 7 });
    await estabilizar();
    assert.equal(app.renderizar().usuario, null);
    assert.equal(app.renderizar().carregando, false);
});

test('a importação inicia após autenticar e não é disparada pelos intervalos ou pela volta do segundo plano', async () => {
    let concluir;
    const app = await preparar({ sincronizar: () => new Promise((resolve) => { concluir = resolve; }) });
    assert.deepEqual(app.importacoes, []);
    await app.entrar(7);
    assert.deepEqual(app.importacoes, [7]);
    for (let i = 0; i < 3; i++) {
        app.mudarEstado('background');
        app.mudarEstado('active');
        app.avancarIntervalos();
        app.renderizar();
    }
    assert.deepEqual(app.importacoes, [7]);
    assert.equal(app.renderizar().revisaoHistoricos, 0);
    concluir({ importados: 1 });
    await estabilizar();
    assert.equal(app.renderizar().revisaoHistoricos, 1);
    assert.equal(app.renderizar().atualizarHistoricos, undefined);
    assert.equal(app.renderizar().historicos, undefined);
});

test('uma sessão restaurada inicia a busca automaticamente e falhas não geram consultas repetidas nesta abertura', async () => {
    const app = await preparar({ restaurado: { id_usuario: 7 }, sincronizar: async () => { throw new Error('Sem conexão'); } });
    await estabilizar();
    app.renderizar();
    app.mudarEstado('active');
    app.avancarIntervalos();
    assert.deepEqual(app.importacoes, [7]);
    assert.equal(app.renderizar().revisaoHistoricos, 1);
});

test('a conclusão de uma importação da conta anterior não atualiza as telas da nova sessão', async () => {
    const conclusoes = new Map();
    const app = await preparar({ sincronizar: (id) => new Promise((resolve) => conclusoes.set(id, resolve)) });
    await app.entrar(7);
    await app.sair();
    await app.entrar(8);
    assert.deepEqual(app.importacoes, [7, 8]);
    conclusoes.get(7)({ importados: 1 });
    await estabilizar();
    assert.equal(app.renderizar().revisaoHistoricos, 0);
    conclusoes.get(8)({ importados: 1 });
    await estabilizar();
    assert.equal(app.renderizar().revisaoHistoricos, 1);
    assert.equal(app.renderizar().usuario.id_usuario, 8);
});
