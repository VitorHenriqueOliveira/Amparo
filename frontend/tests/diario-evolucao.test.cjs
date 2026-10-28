const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const babel = require('@babel/core');

async function preparar(consultar) {
    const estados = [];
    let indice;
    let efeito;
    let dependencias;
    let anteriores;
    let limpar;
    let fechado = false;
    let atualizacoesAposFechar = 0;
    let acessosAoDiario = 0;
    const jsx = (tipo, props) => ({ tipo, props });
    const mocks = {
        react: {
            useState(inicial) {
                const posicao = indice++;
                if (!(posicao in estados)) estados[posicao] = inicial;
                return [estados[posicao], (valor) => {
                    if (fechado) atualizacoesAposFechar++;
                    estados[posicao] = typeof valor === 'function' ? valor(estados[posicao]) : valor;
                }];
            },
            useEffect(callback, deps) { efeito = callback; dependencias = deps; },
        },
        'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'Fragment' },
        'react-native': Object.fromEntries(['FlatList', 'Modal', 'Text', 'TouchableOpacity', 'View'].map((nome) => [nome, nome])),
        '@expo/vector-icons': { Ionicons: 'Ionicons' },
        '../services/diario': { listarDiarioPeriodo: consultar },
        '../services/api': { mensagemFalhaConexao: (_, alternativa) => alternativa },
        '../theme/estilos': { criarEstilos: (valor) => valor },
        '../theme/tema': { CORES: {}, MEDIDAS: {} },
    };
    const contexto = vm.createContext({ Date });
    const fonte = fs.readFileSync(path.join(__dirname, '../src/components/RegistrosDiario.js'), 'utf8');
    const codigo = babel.transformSync(fonte, { configFile: false, babelrc: false,
        plugins: [[require.resolve('@babel/plugin-transform-react-jsx'), { runtime: 'automatic' }]],
    }).code;
    const modulo = new vm.SourceTextModule(codigo, { context: contexto });
    await modulo.link((specifier) => {
        assert.ok(specifier in mocks);
        const valores = mocks[specifier];
        return new vm.SyntheticModule(Object.keys(valores), function () {
            for (const [nome, valor] of Object.entries(valores)) this.setExport(nome, valor);
        }, { context: contexto });
    });
    await modulo.evaluate();
    const props = {
        periodo: { inicio: '2026-10-15', fim: '2026-10-15', intervalo: 'Dia 15/10/2026' },
        onFechar() { fechado = true; limpar?.(); },
        onAbrirDiario() { acessosAoDiario++; },
    };
    function renderizar() {
        indice = 0;
        const arvore = modulo.namespace.default(props);
        if (!anteriores || dependencias.some((valor, i) => valor !== anteriores[i])) {
            limpar?.();
            anteriores = dependencias;
            limpar = efeito();
        }
        return arvore;
    }
    function procurar(no, condicao) {
        if (Array.isArray(no)) return no.flatMap((item) => procurar(item, condicao));
        if (!no || typeof no !== 'object') return [];
        return [...(condicao(no) ? [no] : []), ...procurar(no.props?.children, condicao)];
    }
    return {
        async estabilizar() { renderizar(); await new Promise((resolve) => setImmediate(resolve)); renderizar(); },
        botao(nome) {
            const [no] = procurar(renderizar(), (item) => item.props?.accessibilityLabel === nome);
            assert.ok(no, 'Controle ausente: ' + nome);
            return no.props;
        },
        lista() { return procurar(renderizar(), (no) => no.tipo === 'FlatList')[0]?.props.data; },
        fechar: props.onFechar,
        resultados() { return { atualizacoesAposFechar, acessosAoDiario }; },
    };
}

test('leitura pagina os registros, mantém o período e oferece navegação ao diário', async () => {
    const consultas = [];
    const tela = await preparar(async (inicio, fim, pagina) => {
        consultas.push({ inicio, fim, pagina });
        return { pagina, total: 21, totalPaginas: 2,
            notas: Array.from({ length: pagina === 1 ? 20 : 1 }, (_, indice) => ({ id: (pagina - 1) * 20 + indice + 1 })) };
    });
    await tela.estabilizar();
    assert.equal(tela.lista().length, 20);
    assert.equal(tela.botao('Página anterior do diário').disabled, true);
    tela.botao('Próxima página do diário').onPress();
    await tela.estabilizar();
    assert.equal(tela.lista()[0].id, 21);
    assert.equal(tela.botao('Próxima página do diário').disabled, true);
    assert.deepEqual(consultas, [
        { inicio: '2026-10-15', fim: '2026-10-15', pagina: 1 },
        { inicio: '2026-10-15', fim: '2026-10-15', pagina: 2 },
    ]);
    tela.botao('Abrir tela do diário').onPress();
    assert.equal(tela.resultados().acessosAoDiario, 1);
});

test('toques repetidos respeitam o limite de páginas e exclusões remotas reajustam a leitura', async () => {
    let removido = false;
    const tela = await preparar(async (inicio, fim, pagina) => ({
        pagina, total: removido ? 1 : 21, totalPaginas: removido ? 1 : 2,
        notas: removido && pagina === 2 ? [] : [{ id: 1 }],
    }));
    await tela.estabilizar();
    removido = true;
    const botao = tela.botao('Próxima página do diário');
    botao.onPress();
    botao.onPress();
    await tela.estabilizar();
    await tela.estabilizar();
    assert.equal(tela.lista().length, 1);
    assert.equal(tela.resultados().atualizacoesAposFechar, 0);
});

test('falha ao carregar pode ser repetida e não mantém dados de outra página', async () => {
    let consultas = 0;
    const tela = await preparar(async () => {
        if (++consultas === 1) throw new Error('Sem rede');
        return { pagina: 1, total: 0, totalPaginas: 0, notas: [] };
    });
    await tela.estabilizar();
    assert.equal(tela.lista(), undefined);
    tela.botao('Tentar carregar diário novamente').onPress();
    await tela.estabilizar();
    assert.equal(tela.lista().length, 0);
    assert.equal(consultas, 2);
});

test('fechar a leitura descarta respostas atrasadas sem atualizar o componente desmontado', async () => {
    let concluir;
    const tela = await preparar(() => new Promise((resolve) => { concluir = resolve; }));
    await tela.estabilizar();
    tela.fechar();
    concluir({ pagina: 1, total: 0, totalPaginas: 0, notas: [] });
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(tela.resultados().atualizacoesAposFechar, 0);
});
