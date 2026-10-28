const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const babel = require('@babel/core');

// Executa os handlers da tela com estado controlado, sem substituir sua lógica de confirmação.
async function prepararTela(salvar) {
    const estado = [];
    const referencias = [];
    let posicaoEstado = 0;
    let posicaoReferencia = 0;
    let idsGerados = 0;
    const jsx = (tipo, props) => ({ tipo, props });
    const contexto = vm.createContext({ console });
    const mocks = {
        'react': {
            useState(inicial) {
                const indice = posicaoEstado++;
                if (!(indice in estado)) estado[indice] = inicial;
                return [estado[indice], (novo) => {
                    estado[indice] = typeof novo === 'function' ? novo(estado[indice]) : novo;
                }];
            },
            useRef(inicial) {
                const indice = posicaoReferencia++;
                return referencias[indice] ||= { current: inicial };
            },
            useEffect() {},
        },
        'react/jsx-runtime': { jsx, jsxs: jsx },
        'react-native': {
            Platform: { OS: 'web' },
            View: 'View', Text: 'Text', TouchableOpacity: 'TouchableOpacity',
            ScrollView: 'ScrollView', Modal: 'Modal', Easing: {},
            Animated: { View: 'Animated.View', Value: class { interpolate() { return 0; } } },
        },
        'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' },
        'expo-linear-gradient': { LinearGradient: 'LinearGradient' },
        '@expo/vector-icons': { Ionicons: 'Ionicons' },
        '../theme/estilos': { criarEstilos: (definicoes) => definicoes },
        '../theme/tema': { CORES: {}, DEGRADES: {} },
        '../components/NavegacaoPadrao': { AreaDaTela: 'AreaDaTela', Cabecalho: 'Cabecalho', NavegacaoInferior: 'NavegacaoInferior' },
        '../services/emocoes': {
            adicionarEmocao: salvar,
            criarIdConfirmacao: () => 'confirmacao-' + ++idsGerados,
        },
        '../services/api': { mensagemFalhaConexao: (_, alternativa) => alternativa },
    };
    const fonte = fs.readFileSync(path.join(__dirname, '../src/screens/Emocao.js'), 'utf8');
    const codigo = babel.transformSync(fonte, {
        configFile: false,
        babelrc: false,
        plugins: [[require.resolve('@babel/plugin-transform-react-jsx'), { runtime: 'automatic' }]],
    }).code;
    const modulo = new vm.SourceTextModule(codigo, { context: contexto });
    await modulo.link((specifier) => {
        assert.ok(specifier in mocks, 'Dependência não prevista: ' + specifier);
        const valores = mocks[specifier];
        return new vm.SyntheticModule(Object.keys(valores), function () {
            for (const [chave, valor] of Object.entries(valores)) this.setExport(chave, valor);
        }, { context: contexto });
    });
    await modulo.evaluate();

    function renderizar() {
        posicaoEstado = 0;
        posicaoReferencia = 0;
        return modulo.namespace.default({ navigation: {} });
    }

    function procurar(no, criterio) {
        if (Array.isArray(no)) return no.flatMap((item) => procurar(item, criterio));
        if (!no || typeof no !== 'object') return [];
        return [...(criterio(no) ? [no] : []), ...procurar(no.props?.children, criterio)];
    }

    return {
        botao(nome) {
            const [botao] = procurar(renderizar(), (no) => no.props?.accessibilityLabel === nome);
            assert.ok(botao, 'Botão ausente: ' + nome);
            return botao.props;
        },
        alertas() {
            return procurar(renderizar(), (no) => no.props?.accessibilityRole === 'alert');
        },
        modalAberto() {
            return procurar(renderizar(), (no) => no.tipo === 'Modal')[0].props.visible;
        },
    };
}

test('toques repetidos enviam uma gravação e somente a resposta bem-sucedida confirma', async () => {
    const chamadas = [];
    let concluir;
    const tela = await prepararTela((...args) => {
        chamadas.push(args);
        return new Promise((resolve) => { concluir = resolve; });
    });
    tela.botao('Selecionar emoção Feliz').onPress();
    const confirmar = tela.botao('Salvar sentimento').onPress;
    const pendente = confirmar();
    await confirmar();
    assert.equal(chamadas.length, 1);
    assert.equal(tela.botao('Salvar sentimento').disabled, true);
    assert.equal(tela.alertas().length, 0);
    assert.equal(tela.modalAberto(), true);
    tela.botao('Mudar sentimento').onPress();
    assert.equal(tela.modalAberto(), true);
    concluir({ id: 1 });
    await pendente;
    assert.equal(tela.modalAberto(), false);
    assert.equal(tela.alertas()[0].props.accessibilityLabel, 'Sentimento registrado com sucesso');
});

test('falha mantém a seleção e reenvia a mesma confirmação sem indicar sucesso', async () => {
    const chamadas = [];
    const tela = await prepararTela(async (...args) => {
        chamadas.push(args);
        if (chamadas.length === 1) throw new Error('Resposta perdida');
        return { id: 1 };
    });
    tela.botao('Selecionar emoção Triste').onPress();
    await tela.botao('Salvar sentimento').onPress();
    assert.equal(tela.modalAberto(), true);
    assert.equal(tela.botao('Salvar sentimento').disabled, false);
    assert.equal(tela.alertas().some((alerta) => alerta.props.accessibilityLabel === 'Sentimento registrado com sucesso'), false);
    assert.equal(tela.alertas().length, 1);
    await tela.botao('Salvar sentimento').onPress();
    assert.deepEqual(chamadas, [['triste', 'confirmacao-1'], ['triste', 'confirmacao-1']]);
    assert.equal(tela.modalAberto(), false);
});

test('trocar de sentimento após falha inicia uma confirmação diferente', async () => {
    const chamadas = [];
    const tela = await prepararTela(async (...args) => {
        chamadas.push(args);
        throw new Error('Sem conexão');
    });
    tela.botao('Selecionar emoção Neutro').onPress();
    await tela.botao('Salvar sentimento').onPress();
    tela.botao('Mudar sentimento').onPress();
    assert.equal(tela.modalAberto(), false);
    tela.botao('Selecionar emoção Raiva').onPress();
    await tela.botao('Salvar sentimento').onPress();
    assert.deepEqual(chamadas, [['neutro', 'confirmacao-1'], ['raiva', 'confirmacao-2']]);
});
