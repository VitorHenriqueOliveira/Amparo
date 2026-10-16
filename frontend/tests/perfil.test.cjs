const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const babel = require('@babel/core');

const usuario = { id_usuario: 7, nome: 'Pessoa de teste', email: 'teste@example.com', st_notificacao: false };
const estabilizar = () => new Promise((resolve) => setImmediate(resolve));

// Executa os handlers reais e controla somente os hooks e as dependências externas.
async function carregar(arquivo, dependencias) {
    const estados = [];
    const referencias = [];
    let indiceEstado;
    let indiceReferencia;
    let foco;
    const jsx = (tipo, props) => ({ tipo, props });
    const react = {
        createContext: () => ({ Provider: 'Provider' }),
        useState(inicial) {
            const indice = indiceEstado++;
            if (!(indice in estados)) estados[indice] = inicial;
            return [estados[indice], (valor) => {
                estados[indice] = typeof valor === 'function' ? valor(estados[indice]) : valor;
            }];
        },
        useRef(inicial) {
            return referencias[indiceReferencia++] ||= { current: inicial };
        },
        useContext: () => dependencias.perfil,
        useCallback: (callback) => callback,
        useEffect() {},
    };
    const mocks = {
        react: { default: react, ...react },
        'react/jsx-runtime': { jsx, jsxs: jsx },
        'react-native': {
            Platform: { OS: 'web' }, AppState: {}, Alert: {},
            ...Object.fromEntries(['View', 'Text', 'StatusBar', 'ScrollView', 'TouchableOpacity',
                'Switch', 'Modal', 'TextInput', 'KeyboardAvoidingView'].map((nome) => [nome, nome])),
        },
        '@react-navigation/native': { useFocusEffect(callback) { foco = callback; } },
        'expo-linear-gradient': { LinearGradient: 'LinearGradient' },
        '@expo/vector-icons': { Ionicons: 'Ionicons' },
        '../contexts/AuthContext': { AuthContext: {} },
        '../theme/estilos': { criarEstilos: (valor) => valor },
        '../theme/tema': { CORES: {}, DEGRADES: {} },
        '../components/NavegacaoPadrao': { AreaDaTela: 'AreaDaTela', Cabecalho: 'Cabecalho', NavegacaoInferior: 'NavegacaoInferior' },
        ...dependencias.imports,
    };
    const contexto = vm.createContext({ console });
    const fonte = fs.readFileSync(path.join(__dirname, '..', arquivo), 'utf8');
    const codigo = babel.transformSync(fonte, {
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

    function renderizar() {
        indiceEstado = 0;
        indiceReferencia = 0;
        return (modulo.namespace.default || modulo.namespace.AuthProvider)({ navigation: {} });
    }

    function procurar(no, criterio) {
        if (Array.isArray(no)) return no.flatMap((item) => procurar(item, criterio));
        if (!no || typeof no !== 'object') return [];
        return [...(criterio(no) ? [no] : []), ...procurar(no.props?.children, criterio)];
    }

    return {
        renderizar,
        async focar() { renderizar(); foco(); await estabilizar(); },
        props(tipo) { return procurar(renderizar(), (no) => no.tipo === tipo)[0].props; },
        botao(nome) {
            const [no] = procurar(renderizar(), (item) => item.props?.accessibilityLabel === nome);
            assert.ok(no, 'Controle ausente: ' + nome);
            return no.props;
        },
        erros() { return procurar(renderizar(), (no) => no.props?.accessibilityRole === 'alert'); },
    };
}

async function prepararTela(operacoes = {}) {
    const perfil = {
        usuario: { ...usuario },
        async recarregarPerfil() {},
        async atualizarNome(nome) { perfil.usuario = { ...perfil.usuario, nome }; },
        async salvarNotificacoes(valor) { perfil.usuario = { ...perfil.usuario, st_notificacao: valor }; },
        ...operacoes,
    };
    return { perfil, tela: await carregar('src/screens/Perfil.js', { perfil }) };
}

test('perfil carrega a preferência salva a cada abertura e permite repetir uma consulta que falhou', async () => {
    let consultas = 0;
    const { tela, perfil } = await prepararTela({ async recarregarPerfil() {
        consultas++;
        if (consultas === 1) throw new Error('Sem rede');
        perfil.usuario.st_notificacao = true;
    } });

    await tela.focar();
    assert.equal(tela.props('Switch').disabled, true);
    assert.equal(tela.erros().length, 1);
    await tela.botao('Recarregar perfil').onPress();
    assert.equal(tela.props('Switch').value, true);
    assert.equal(tela.props('Switch').disabled, false);
    await tela.focar();
    assert.equal(consultas, 3);
});

test('toggle responde imediatamente, bloqueia envios duplicados e reverte após falha', async () => {
    let rejeitar;
    let envios = 0;
    const { tela } = await prepararTela({ salvarNotificacoes() {
        envios++;
        return new Promise((resolve, reject) => { rejeitar = reject; });
    } });

    await tela.focar();
    assert.equal(tela.props('Switch').value, false);
    const controle = tela.props('Switch');
    const envio = controle.onValueChange(true);
    controle.onValueChange(false);
    assert.equal(tela.props('Switch').value, true);
    assert.equal(tela.props('Switch').disabled, true);
    assert.equal(envios, 1);
    rejeitar(new Error('Sem rede'));
    await envio;
    assert.equal(tela.props('Switch').value, false);
    assert.equal(tela.props('Switch').disabled, false);
    assert.equal(tela.erros().length, 1);
});

test('toggle confirmado permanece salvo e edição do nome mantém a preferência da conta', async () => {
    const { tela, perfil } = await prepararTela();
    await tela.focar();
    await tela.props('Switch').onValueChange(true);
    assert.equal(tela.props('Switch').value, true);
    assert.equal(perfil.usuario.st_notificacao, true);
    assert.equal(tela.props('Cabecalho').titulo, 'Seu perfil');
    tela.props('Cabecalho').onEditar();
    tela.botao('Nome do perfil').onChangeText(' Nome atualizado ');
    await tela.botao('Salvar alterações').onPress();
    assert.equal(perfil.usuario.nome, 'Nome atualizado');
    assert.equal(perfil.usuario.st_notificacao, true);
    assert.equal(tela.props('Modal').visible, false);
});

test('edição mantém o modal e informa erro quando o nome é inválido ou não é salvo', async () => {
    let envios = 0;
    const { tela } = await prepararTela({ async atualizarNome() { envios++; throw new Error('Sem rede'); } });
    await tela.focar();
    tela.botao('Editar nome').onPress();
    tela.botao('Nome do perfil').onChangeText(' ');
    await tela.botao('Salvar alterações').onPress();
    assert.equal(envios, 0);
    tela.botao('Nome do perfil').onChangeText('Novo nome');
    await tela.botao('Salvar alterações').onPress();
    assert.equal(envios, 1);
    assert.equal(tela.props('Modal').visible, true);
    assert.equal(tela.erros().length, 1);
});

test('resposta de perfil recebida após logout não reabre a conta nem salva dados antigos', async () => {
    let concluir;
    let gravacoes = 0;
    const tela = await carregar('src/contexts/AuthContext.js', { imports: {
        '../services/api': { observarFalhaAutenticacao() {} },
        '../services/calma': { sincronizarCiclosCalma() {} },
        '../services/historicos': { sincronizarHistoricosAntigos() {} },
        '../services/usuario': {
            buscarPerfil: () => new Promise((resolve) => { concluir = resolve; }),
            atualizarPerfil() {}, atualizarNotificacoes() {},
        },
        '../services/sessao': {
            restaurarSessao() {}, async iniciarSessao() {}, async encerrarSessao() {},
            async salvarUsuario() { gravacoes++; }, observarExpiracao() {}, verificarExpiracao() {},
        },
    } });

    await tela.renderizar().props.value.login(usuario, 'token-simulado');
    const atualizacao = tela.renderizar().props.value.recarregarPerfil();
    await tela.renderizar().props.value.logout();
    concluir({ ...usuario, nome: 'Resposta atrasada' });
    await assert.rejects(atualizacao, /sessão mudou/);
    assert.equal(tela.renderizar().props.value.usuario, null);
    assert.equal(gravacoes, 0);
});
