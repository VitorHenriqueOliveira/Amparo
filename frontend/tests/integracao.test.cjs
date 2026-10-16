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

        const namespace = ['expo-secure-store', 'expo-crypto', 'react-native', 'jwt-decode'].includes(specifier)
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

test('histórico local permanece disponível apenas para a conta de origem', async () => {
    const storage = storageMock([
        ['@amparo/emocoes', JSON.stringify([{ emotionKey: 'triste' }])],
        ['@amparo/emocoes:7', JSON.stringify([{ emotionKey: 'feliz' }])],
        ['@amparo/sono:7', JSON.stringify([{ date: '2026-10-14', sleepTime: '22:30', wakeTime: '06:30', totalMinutes: 480 }])],
    ]);
    const registros = await carregar('src/storage/registros.js', { '@react-native-async-storage/async-storage': storage });
    assert.equal((await registros.listarEmocoes(7))[0].emotionKey, 'feliz');
    assert.equal((await registros.listarSono(7))[0].totalMinutes, 480);
    assert.equal((await registros.listarEmocoes(8)).length, 0);
    assert.equal((await registros.listarSono(8)).length, 0);
    await assert.rejects(registros.listarSono(undefined), /inválido/);
    assert.ok(storage.dados.has('@amparo/emocoes'));
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

test('emoções enviam somente a seleção e preservam o timestamp e todos os registros da API', async () => {
    const chamadas = [];
    const registro = {
        id_registro_emocao: 42,
        id_usuario: 7,
        id_emocao: 'Feliz',
        data_registro: '2026-10-14',
        hora_registro: '02:30:00',
        registrado_em: '2026-10-14T02:30:00.000Z',
    };
    const api = {
        async post(...args) {
            chamadas.push(['post', ...args]);

            return { data: { ...registro, id_emocao: args[1].id_emocao } };
        },
        async get(...args) {
            chamadas.push(['get', ...args]);

            return { data: [registro, { ...registro, id_registro_emocao: 43, id_emocao: 'Triste' }] };
        },
    };
    const idCliente = 'c0b91490-11f5-4696-8bfd-968e21b87bba';
    const emocoes = await carregar('src/services/emocoes.js', { './api': api, 'expo-crypto': { randomUUID: () => idCliente } });

    for (const [chave, titulo] of [['feliz', 'Feliz'], ['triste', 'Triste'], ['neutro', 'Neutro'], ['raiva', 'Raiva']]) {
        const salvo = await emocoes.adicionarEmocao(chave, emocoes.criarIdConfirmacao());

        assert.equal(salvo.id, 42);
        assert.equal(salvo.emotionKey, chave);
        assert.equal(salvo.emotionTitle, titulo);
        assert.equal(salvo.date, registro.registrado_em);
        assert.equal(salvo.createdAt, registro.registrado_em);
        assert.deepEqual(JSON.parse(JSON.stringify(chamadas.at(-1))), ['post', '/emocoes', { id_emocao: titulo, id_cliente: idCliente }]);
    }

    const historico = await emocoes.listarEmocoes();

    assert.equal(historico.length, 2);
    assert.equal(historico[0].id, 42);
    assert.equal(historico[1].id, 43);
    assert.equal(historico[1].emotionKey, 'triste');
    assert.deepEqual(JSON.parse(JSON.stringify(chamadas.at(-1))), ['get', '/emocoes']);
});

test('emoções inválidas não chegam à API e falhas de rede não confirmam persistência', async () => {
    let chamadas = 0;
    const api = {
        async post() {
            chamadas++;
            throw new Error('API indisponível');
        },
        async get() {
            throw new Error('API indisponível');
        },
    };
    const emocoes = await carregar('src/services/emocoes.js', { './api': api, 'expo-crypto': { randomUUID: () => 'c0b91490-11f5-4696-8bfd-968e21b87bba' } });

    for (const chave of [undefined, null, [], ['feliz'], {}, '', 'Feliz', 'ansioso', 'toString', '__proto__']) {
        await assert.rejects(emocoes.adicionarEmocao(chave), /válida/);
    }

    assert.equal(chamadas, 0);
    await assert.rejects(emocoes.adicionarEmocao('feliz', emocoes.criarIdConfirmacao()), /indisponível/);
    assert.equal(chamadas, 1);
    await assert.rejects(emocoes.listarEmocoes(), /indisponível/);
});

test('perfil envia o nome normalizado ao servidor e propaga falhas sem afirmar que salvou', async () => {
    const chamadas = [];
    const api = { async put(...args) { chamadas.push(args); return { data: { usuario: { ...usuario, nome: 'Novo' } } }; } };
    const perfil = await carregar('src/services/usuario.js', { './api': api });
    assert.equal((await perfil.atualizarPerfil(' Novo ')).nome, 'Novo');
    assert.deepEqual(JSON.parse(JSON.stringify(chamadas[0])), ['/perfil', { nome: 'Novo' }]);
    await assert.rejects(perfil.atualizarPerfil(' '), /nome/);
    await assert.rejects(perfil.atualizarPerfil('x'.repeat(101)), /nome/);
    api.put = async () => { throw new Error('API indisponível'); };
    await assert.rejects(perfil.atualizarPerfil('Novo'), /indisponível/);
});

test('tentativa de reenvio usa o mesmo identificador de confirmação', async () => {
    const chamadas = [];
    const id_cliente = 'c0b91490-11f5-4696-8bfd-968e21b87bba';
    const api = { async post(rota, body) {
        chamadas.push({ rota, body });
        if (chamadas.length === 1) throw new Error('Resposta perdida');
        return { data: { id_registro_emocao: 42, id_emocao: 'Feliz', registrado_em: '2026-10-14T02:30:00Z' } };
    } };
    const emocoes = await carregar('src/services/emocoes.js', { './api': api, 'expo-crypto': { randomUUID: () => id_cliente } });
    const confirmacao = emocoes.criarIdConfirmacao();
    await assert.rejects(emocoes.adicionarEmocao('feliz', confirmacao), /perdida/);
    assert.equal((await emocoes.adicionarEmocao('feliz', confirmacao)).id, 42);
    assert.equal(chamadas[0].body.id_cliente, chamadas[1].body.id_cliente);
    await assert.rejects(emocoes.adicionarEmocao('feliz'), /Identificador/);
});
