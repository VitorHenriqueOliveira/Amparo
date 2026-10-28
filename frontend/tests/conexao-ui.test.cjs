const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const babel = require('@babel/core');

const estabilizar = () => new Promise((resolve) => setImmediate(resolve));

async function preparar(arquivo, imports = {}) {
    const hooks = [];
    const alertas = [];
    let posicao;
    let foco;
    const jsx = (tipo, props) => ({ tipo, props });
    const mocks = {
        react: {
            useState(inicial) {
                const indice = posicao++;
                if (!(indice in hooks)) hooks[indice] = inicial;
                return [hooks[indice], (valor) => { hooks[indice] = typeof valor === 'function' ? valor(hooks[indice]) : valor; }];
            },
            useRef(inicial) { return hooks[posicao++] ||= { current: inicial }; },
            useContext: () => ({ usuario: { id_usuario: 7 }, login: async () => {} }),
            useCallback: (callback) => callback,
            useEffect() {},
        },
        'react/jsx-runtime': { jsx, jsxs: jsx },
        'react-native': {
            ...Object.fromEntries(['View', 'Text', 'TextInput', 'TouchableOpacity', 'FlatList',
                'KeyboardAvoidingView', 'ActivityIndicator'].map((tipo) => [tipo, tipo])),
            Platform: { OS: 'web' }, Alert: {}, Easing: {},
            Animated: { View: 'Animated.View', Value: class {} },
            useWindowDimensions: () => ({ height: 720, width: 360 }),
        },
        'expo-linear-gradient': { LinearGradient: 'LinearGradient' },
        '@expo/vector-icons': { Ionicons: 'Ionicons' },
        '@react-navigation/native': { useFocusEffect: (callback) => { foco = callback; } },
        '../contexts/AuthContext': { AuthContext: {} },
        '../components/ConteudoAjustavel': { default: 'ConteudoAjustavel' },
        '../components/NavegacaoPadrao': { AreaDaTela: 'AreaDaTela', Cabecalho: 'Cabecalho', NavegacaoInferior: 'NavegacaoInferior' },
        '../theme/estilos': { criarEstilos: (valor) => valor },
        '../theme/tema': { CORES: {}, DEGRADES: {} },
        ...imports,
    };
    const contexto = vm.createContext({ console, window: { alert: (texto) => alertas.push(texto) } });
    const codigo = babel.transformSync(fs.readFileSync(path.join(__dirname, '..', arquivo), 'utf8'), {
        configFile: false, babelrc: false,
        plugins: [[require.resolve('@babel/plugin-transform-react-jsx'), { runtime: 'automatic' }]],
    }).code;
    const modulo = new vm.SourceTextModule(codigo, { context: contexto });
    await modulo.link((specifier) => {
        assert.ok(specifier in mocks, 'Dependência inesperada: ' + specifier);
        const valores = mocks[specifier];
        return new vm.SyntheticModule(Object.keys(valores), function () {
            for (const [nome, valor] of Object.entries(valores)) this.setExport(nome, valor);
        }, { context: contexto });
    });
    await modulo.evaluate();
    function renderizar() { posicao = 0; return modulo.namespace.default({ navigation: {} }); }
    function procurar(no, criterio) {
        if (Array.isArray(no)) return no.flatMap((item) => procurar(item, criterio));
        if (!no || typeof no !== 'object') return [];
        return [...(criterio(no) ? [no] : []), ...procurar(no.props?.children, criterio)];
    }
    return {
        alertas,
        controle: (nome) => procurar(renderizar(), (no) => no.props?.accessibilityLabel === nome)[0]?.props,
        campo: (nome) => procurar(renderizar(), (no) => no.props?.placeholder === nome)[0]?.props,
        textos: () => procurar(renderizar(), (no) => no.tipo === 'Text').map((no) => no.props.children),
        async focar() { renderizar(); foco(); await estabilizar(); },
    };
}

test('login preserva os campos e libera nova tentativa após falha sem duplicar o envio', async () => {
    let envios = 0;
    let rejeitar;
    const tela = await preparar('src/screens/login.js', {
        '../services/api': {
            default: { post: () => {
                envios++;
                return new Promise((resolve, reject) => { rejeitar = reject; });
            } },
            mensagemFalhaConexao: () => 'Aguarde e tente novamente.',
        },
    });
    tela.campo('Email').onChangeText('teste@example.com');
    tela.campo('Senha').onChangeText('senha-ficticia');
    const entrar = tela.controle('Entrar').onPress;
    const tentativa = entrar();
    await entrar();
    assert.equal(envios, 1);
    assert.equal(tela.controle('Entrar').disabled, true);
    rejeitar({ code: 'ECONNABORTED' });
    await tentativa;
    assert.equal(tela.controle('Entrar').disabled, false);
    assert.equal(tela.campo('Email').value, 'teste@example.com');
    assert.equal(tela.campo('Senha').value, 'senha-ficticia');
    assert.deepEqual(tela.alertas, ['Aguarde e tente novamente.']);
    const segunda = tela.controle('Entrar').onPress();
    assert.equal(envios, 2);
    rejeitar({ response: { status: 401 } });
    await segunda;
    assert.match(tela.alertas[1], /E-mail ou senha incorretos/);
});

test('diário mostra uma nova tentativa após falha e volta a consultar sem trocar de tela', async () => {
    let consultas = 0;
    const tela = await preparar('src/screens/Diario.js', {
        '../services/api': { mensagemFalhaConexao: () => 'Aguarde e tente novamente.' },
        '../services/diario': {
            listarDiario: async () => {
                if (++consultas === 1) throw { code: 'ECONNABORTED' };
                return [];
            },
            criarNota() {}, atualizarNota() {}, excluirNota() {},
        },
    });
    await tela.focar();
    assert.ok(tela.textos().includes('Aguarde e tente novamente.'));
    tela.controle('Tentar carregar registros novamente').onPress();
    await tela.focar();
    assert.equal(consultas, 2);
    assert.equal(tela.controle('Tentar carregar registros novamente'), undefined);
    assert.ok(tela.textos().some((texto) => typeof texto === 'string' && texto.startsWith('Nenhum registro encontrado.')));
});
