const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { jwtDecode } = require('jwt-decode');

// Os testes de sessão usam armazenamento e relógio controlados.
async function carregar(arquivo, imports, globais = {}) {
    const contexto = vm.createContext({ Date, Math, console, ...globais });
    const modulo = new vm.SourceTextModule(fs.readFileSync(path.join(__dirname, '..', arquivo), 'utf8'), {
        context: contexto,
    });

    await modulo.link((specifier) => {
        assert.ok(specifier in imports, 'Dependência inesperada: ' + specifier);

        const namespace = ['expo-secure-store', 'react-native', 'jwt-decode'].includes(specifier)
            ? imports[specifier]
            : { default: imports[specifier] };

        return new vm.SyntheticModule(Object.keys(namespace), function () {
            for (const [chave, valor] of Object.entries(namespace)) {
                this.setExport(chave, valor);
            }
        }, { context: contexto });
    });

    await modulo.evaluate();

    return modulo.namespace;
}

function storageMock(inicial = []) {
    const dados = new Map(inicial);

    return {
        dados,
        async getItem(chave) {
            return dados.get(chave) ?? null;
        },
        async setItem(chave, valor) {
            dados.set(chave, valor);
        },
        async removeItem(chave) {
            dados.delete(chave);
        },
        async multiGet(chaves) {
            return chaves.map((chave) => [chave, dados.get(chave) ?? null]);
        },
        async multiSet(entradas) {
            entradas.forEach(([chave, valor]) => dados.set(chave, valor));
        },
        async multiRemove(chaves) {
            chaves.forEach((chave) => dados.delete(chave));
        },
    };
}

const usuario = { id_usuario: 7, nome: 'Pessoa de teste', email: 'teste@example.com' };

function tokenTeste(id = 7, exp = Math.floor(Date.now() / 1000) + 3600) {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({ id_usuario: id, exp })).toString('base64url');

    return header + '.' + payload + '.assinatura-simulada';
}

async function prepararSessao(plataforma = 'android') {
    const storage = storageMock();
    const cofre = new Map();
    const temporizadores = [];
    const relogio = { agora: Date.now() };
    const api = {
        defaults: { headers: { common: {} } },
        async get(rota) {
            assert.equal(rota, '/sessao');

            return { data: { usuario } };
        },
    };

    const secure = {
        async getItemAsync(chave) {
            return cofre.get(chave) ?? null;
        },
        async setItemAsync(chave, valor) {
            if (secure.falharGravacao) {
                throw new Error('Cofre indisponível');
            }

            cofre.set(chave, valor);
        },
        async deleteItemAsync(chave) {
            cofre.delete(chave);
        },
    };

    class DataControlada extends Date {
        static now() {
            return relogio.agora;
        }
    }

    const sessao = await carregar('src/services/sessao.js', {
        '@react-native-async-storage/async-storage': storage,
        'expo-secure-store': secure,
        'react-native': { Platform: { OS: plataforma } },
        'jwt-decode': { jwtDecode },
        './api': api,
    }, {
        Date: DataControlada,
        setTimeout(callback, atraso) {
            const temporizador = { callback, atraso, cancelado: false };

            temporizadores.push(temporizador);

            return temporizador;
        },
        clearTimeout(temporizador) {
            if (temporizador) {
                temporizador.cancelado = true;
            }
        },
    });

    return { sessao, storage, cofre, secure, api, relogio, temporizadores };
}

test('mobile guarda JWT no cofre, valida restauração na API e limpa no logout', async () => {
    const { sessao, storage, cofre, api } = await prepararSessao();
    const token = tokenTeste();

    await sessao.iniciarSessao(usuario, token);

    assert.equal(cofre.get('amparo.token'), token);
    assert.equal(storage.dados.has('@Amparo:token'), false);
    assert.equal(api.defaults.headers.common.Authorization, 'Bearer ' + token);

    api.get = async () => ({ data: { usuario: { ...usuario, nome: 'Nome do servidor' } } });

    assert.equal((await sessao.restaurarSessao()).nome, 'Nome do servidor');

    await sessao.encerrarSessao();

    assert.equal(storage.dados.size, 0);
    assert.equal(cofre.size, 0);
    assert.equal(api.defaults.headers.common.Authorization, undefined);
    assert.equal(await sessao.restaurarSessao(), null);
});

test('sessões corrompidas, expiradas, de outra conta ou legadas não são restauradas', async () => {
    for (const caso of [
        { usuario: '{json inválido', token: tokenTeste() },
        { usuario: JSON.stringify({ nome: 'Sem ID' }), token: tokenTeste() },
        { usuario: JSON.stringify(usuario), token: tokenTeste(7, 1) },
        { usuario: JSON.stringify(usuario), token: tokenTeste(8) },
        { usuario: JSON.stringify(usuario), token: 'token-invalido' },
        { usuario: JSON.stringify(usuario), token: null },
    ]) {
        const { sessao, storage, cofre, api } = await prepararSessao();

        storage.dados.set('@Amparo:usuario', caso.usuario);
        storage.dados.set('@Amparo:token', 'token-legado-nao-criptografado');

        if (caso.token) {
            cofre.set('amparo.token', caso.token);
        }

        api.get = async () => {
            assert.fail('Sessões inválidas não devem fazer chamadas autenticadas.');
        };

        assert.equal(await sessao.restaurarSessao(), null);
        assert.equal(storage.dados.size, 0);
        assert.equal(cofre.size, 0);
        assert.equal(api.defaults.headers.common.Authorization, undefined);
    }
});

test('falha no armazenamento seguro não ativa nem deixa sessão parcial', async () => {
    const { sessao, storage, secure, cofre, api } = await prepararSessao();

    secure.falharGravacao = true;

    await assert.rejects(sessao.iniciarSessao(usuario, tokenTeste()), /salvar a sessão/);
    await assert.rejects(sessao.iniciarSessao({}, 'invalido'), /inválida/);

    assert.equal(storage.dados.size, 0);
    assert.equal(cofre.size, 0);
    assert.equal(api.defaults.headers.common.Authorization, undefined);
});

test('servidor rejeita sessão revogada; erro de rede preserva credencial sem ativar sessão', async () => {
    const { sessao, storage, cofre, api } = await prepararSessao();

    await sessao.iniciarSessao(usuario, tokenTeste());

    api.get = async () => {
        throw new Error('Rede indisponível');
    };

    await assert.rejects(sessao.restaurarSessao(), /Rede/);

    assert.ok(cofre.has('amparo.token'));
    assert.ok(storage.dados.has('@Amparo:usuario'));
    assert.equal(api.defaults.headers.common.Authorization, undefined);

    api.get = async () => {
        throw { response: { status: 401 } };
    };

    assert.equal(await sessao.restaurarSessao(), null);
    assert.equal(cofre.size, 0);
    assert.equal(storage.dados.size, 0);
});

test('expiração fecha acesso e permite limpar a sessão ao voltar do segundo plano', async () => {
    const { sessao, cofre, api, relogio } = await prepararSessao();
    const exp = Math.floor(Date.now() / 1000) + 60;
    let limpeza;
    let encerramentos = 0;

    sessao.observarExpiracao(() => {
        encerramentos++;
        limpeza = sessao.encerrarSessao();
    });

    await sessao.iniciarSessao(usuario, tokenTeste(7, exp));

    relogio.agora = exp * 1000 + 1;
    sessao.verificarExpiracao();

    await limpeza;

    assert.equal(encerramentos, 1);
    assert.equal(api.defaults.headers.common.Authorization, undefined);
    assert.equal(cofre.size, 0);

    sessao.verificarExpiracao();

    assert.equal(encerramentos, 1);
});

test('logout durante restauração impede resposta antiga de reabrir a sessão', async () => {
    const { sessao, api } = await prepararSessao();
    let liberar;
    let avisar;
    const consultaIniciada = new Promise((resolve) => { avisar = resolve; });

    await sessao.iniciarSessao(usuario, tokenTeste());

    api.get = () => {
        avisar();

        return new Promise((resolve) => { liberar = resolve; });
    };

    const restauracao = sessao.restaurarSessao();

    await consultaIniciada;
    await sessao.encerrarSessao();

    liberar({ data: { usuario } });

    assert.equal(await restauracao, null);
    assert.equal(api.defaults.headers.common.Authorization, undefined);
});

test('web não persiste JWT e exige novo login após recarregamento', async () => {
    const { sessao, storage, cofre, api } = await prepararSessao('web');

    await sessao.iniciarSessao(usuario, tokenTeste());

    assert.ok(api.defaults.headers.common.Authorization);
    assert.equal(storage.dados.size, 0);
    assert.equal(cofre.size, 0);
    assert.equal(await sessao.restaurarSessao(), null);
    assert.equal(api.defaults.headers.common.Authorization, undefined);
});

test('401 autenticado invalida a sessão atual e ignora login e respostas de sessões anteriores', async () => {
    let tratarErro;
    let invalidacoes = 0;
    const api = {
        defaults: { headers: { common: { Authorization: 'Bearer atual' } } },
        interceptors: {
            response: {
                use(sucesso, erro) {
                    tratarErro = erro;
                },
            },
        },
    };

    const modulo = await carregar('src/services/api.js', { axios: { create: () => api } }, {
        process: { env: {} },
        __DEV__: true,
    });

    const parar = modulo.observarFalhaAutenticacao(() => { invalidacoes++; });

    for (const [rota, token] of [['/diario/7', 'anterior'], ['/login', 'atual'], ['/usuario', 'atual']]) {
        await assert.rejects(tratarErro({
            response: { status: 401 },
            config: { url: rota, headers: { Authorization: 'Bearer ' + token } },
        }));
    }

    assert.equal(invalidacoes, 0);

    await assert.rejects(tratarErro({
        response: { status: 401 },
        config: { url: '/diario/7', headers: { Authorization: 'Bearer atual' } },
    }));

    assert.equal(invalidacoes, 1);

    parar();
});

test('produção rejeita API sem HTTPS antes de enviar credenciais', async () => {
    await assert.rejects(carregar('src/services/api.js', { axios: {} }, {
        process: { env: { EXPO_PUBLIC_API_URL: 'http://api.example.com/api' } },
        __DEV__: false,
    }), /HTTPS/);
});

test('emoções e sono ficam separados ao trocar de conta', async () => {
    const storage = storageMock([['@amparo/emocoes', JSON.stringify([{ emotionKey: 'triste' }])]]);
    const registros = await carregar('src/storage/registros.js', { '@react-native-async-storage/async-storage': storage });
    await registros.adicionarEmocao(7, 'feliz', 'Feliz');
    await registros.registrarSonoHoje(7, '22:30', '06:30');
    assert.equal((await registros.listarEmocoes(7))[0].emotionKey, 'feliz');
    assert.equal((await registros.listarSono(7))[0].totalMinutes, 480);
    assert.equal((await registros.listarEmocoes(8)).length, 0);
    assert.equal((await registros.listarSono(8)).length, 0);
    assert.ok(storage.dados.has('@amparo/emocoes'), 'O histórico antigo não deve ser apagado nem atribuído a outra conta.');
});

test('editar sono substitui o dia atual, calcula passagem da meia-noite e rejeita horários inválidos', async () => {
    const storage = storageMock();
    const registros = await carregar('src/storage/registros.js', { '@react-native-async-storage/async-storage': storage });
    const primeiro = await registros.registrarSonoHoje(7, '23:45', '07:15');
    assert.equal(primeiro.totalMinutes, 450);
    await registros.registrarSonoHoje(7, '22:00', '07:00');
    const itens = await registros.listarSono(7);
    assert.equal(itens.length, 1);
    assert.equal(itens[0].id, primeiro.id);
    assert.equal(itens[0].totalMinutes, 540);
    await assert.rejects(registros.registrarSonoHoje(7, '25:00', '07:00'), /inválido/);
    await assert.rejects(registros.listarEmocoes(undefined), /inválido/);
});

test('diário converte o contrato da API para as telas e envia CRUD para as rotas existentes', async () => {
    const chamadas = [];
    const nota = { id_diario: 42, descricao: 'Meu dia', data_registro: '2026-10-14' };
    const api = {
        async get(...args) { chamadas.push(['get', ...args]); return { data: [nota] }; },
        async post(...args) { chamadas.push(['post', ...args]); return { data: nota }; },
        async put(...args) { chamadas.push(['put', ...args]); return { data: { ...nota, descricao: 'Editado' } }; },
        async delete(...args) { chamadas.push(['delete', ...args]); },
    };
    const diario = await carregar('src/services/diario.js', { './api': api });
    const notas = await diario.listarDiario(7);
    assert.equal(notas[0].id, 42);
    assert.equal(notas[0].text, 'Meu dia');
    assert.equal(notas[0].date, '14/10/2026');
    assert.equal(notas[0].createdAt, '2026-10-14');
    await diario.criarNota(7, 'Meu dia');
    assert.equal((await diario.atualizarNota(42, 'Editado')).text, 'Editado');
    await diario.excluirNota(42);
    assert.deepEqual(JSON.parse(JSON.stringify(chamadas)), [
        ['get', '/diario/7'], ['post', '/diario', { id_usuario: 7, descricao: 'Meu dia' }],
        ['put', '/diario/42', { descricao: 'Editado' }], ['delete', '/diario/42'],
    ]);
});

test('falha da API do diário é propagada sem cair em persistência local', async () => {
    const api = { get: async () => { throw new Error('API indisponível'); } };
    const diario = await carregar('src/services/diario.js', { './api': api });
    await assert.rejects(diario.listarDiario(7), /indisponível/);
});
