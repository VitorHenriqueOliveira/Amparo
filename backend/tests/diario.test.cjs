const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { randomUUID } = require('node:crypto');

const opcoesToken = {
    algorithm: 'HS256',
    issuer: 'amparo-api',
    audience: 'amparo-app',
    expiresIn: '1m',
};

// Executa HTTP e criptografia reais, substituindo somente o acesso ao banco.
async function criarServidor(t, protecoes = false) {
    const contexto = vm.createContext({ process, console, Buffer, URL });
    const modulos = new Map();
    const consultas = [];
    let consultar = () => [];

    const sql = async (strings, ...valores) => {
        const query = strings.join('?');

        consultas.push({ query, valores });

        return consultar(query, valores);
    };

    const externos = {
        express: { default: express },
        cors: { default: require('cors') },
        helmet: { default: require('helmet') },
        'express-rate-limit': { rateLimit: require('express-rate-limit').rateLimit },
        jsonwebtoken: { default: jwt },
        bcrypt: { default: bcrypt },
        '../db.js': { default: sql },
    };

    async function carregar(arquivo) {
        if (modulos.has(arquivo)) {
            return modulos.get(arquivo);
        }

        const modulo = new vm.SourceTextModule(fs.readFileSync(arquivo, 'utf8'), {
            context: contexto,
            identifier: arquivo,
        });

        modulos.set(arquivo, modulo);

        await modulo.link((specifier, referencia) => {
            if (specifier in externos) {
                const namespace = externos[specifier];

                return new vm.SyntheticModule(Object.keys(namespace), function () {
                    for (const [chave, valor] of Object.entries(namespace)) {
                        this.setExport(chave, valor);
                    }
                }, { context: contexto });
            }

            return carregar(path.resolve(path.dirname(referencia.identifier), specifier));
        });

        return modulo;
    }

    const original = process.env.JWT_SECRET;
    process.env.JWT_SECRET = 'segredo-apenas-para-testes-automatizados';

    t.after(() => {
        if (original === undefined) {
            delete process.env.JWT_SECRET;
        } else {
            process.env.JWT_SECRET = original;
        }
    });

    let app;

    if (protecoes) {
        const modulo = await carregar(path.resolve(__dirname, '../src/app.js'));

        await modulo.evaluate();

        app = modulo.namespace.criarApp({ origensPermitidas: ['https://app.example.com'] });
    } else {
        const diario = await carregar(path.resolve(__dirname, '../src/routes/diario.js'));
        const usuario = await carregar(path.resolve(__dirname, '../src/routes/usuario.js'));

        await diario.evaluate();
        await usuario.evaluate();

        app = express();
        app.use(express.json());
        app.use('/api', usuario.namespace.default);
        app.use('/api', diario.namespace.default);

        // O tratamento completo da API é validado nos testes com proteções.
        app.use((error, req, res, next) => {
            res.status(error.status || 500).json({ erro: 'Requisição inválida.' });
        });
    }

    const server = app.listen(0, '127.0.0.1');

    await new Promise((resolve) => server.once('listening', resolve));

    t.after(() => new Promise((resolve) => server.close(resolve)));

    const base = 'http://127.0.0.1:' + server.address().port + '/api';
    const token = jwt.sign({ id_usuario: 7 }, process.env.JWT_SECRET, opcoesToken);

    function request(url, method = 'GET', body, authorization = 'Bearer ' + token, extras = {}) {
        return fetch(base + url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                ...(authorization ? { Authorization: authorization } : {}),
                ...extras,
            },
            ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        });
    }

    return {
        base,
        request,
        consultas,
        resultado(dados) {
            consultar = () => dados;
        },
        consulta(callback) {
            consultar = callback;
        },
    };
}

test('calma registra somente ciclos válidos e mantém o histórico isolado por conta', async (t) => {
    const api = await criarServidor(t, true);
    const ciclo = {
        id_cliente: '00000000-0000-4000-8000-000000000001',
        concluido_em: new Date().toISOString(),
    };
    const salvo = { ...ciclo, id_calma: 42, duracao_segundos: 14 };

    await t.test('sem token e com dono forjado não chega ao banco', async () => {
        assert.equal((await api.request('/calma', 'GET', undefined, null)).status, 401);
        assert.equal((await api.request('/calma', 'POST', ciclo, null)).status, 401);
        assert.equal((await api.request('/calma', 'POST', { ...ciclo, id_usuario: 8 })).status, 403);
        assert.equal(api.consultas.length, 0);
    });

    await t.test('UUID e data inválidos são rejeitados antes do SQL', async () => {
        for (const body of [
            {}, { ...ciclo, id_cliente: 'inválido' }, { ...ciclo, concluido_em: null },
            { ...ciclo, concluido_em: '2999-01-01T00:00:00.000Z' },
            { ...ciclo, concluido_em: '2026-02-30T00:00:00.000Z' },
        ]) {
            assert.equal((await api.request('/calma', 'POST', body)).status, 400);
        }

        assert.equal(api.consultas.length, 0);
    });

    await t.test('criação vincula o ciclo ao JWT e fixa sua duração', async () => {
        api.resultado([salvo]);

        const resposta = await api.request('/calma', 'POST', { ...ciclo, duracao_segundos: 999 });

        assert.equal(resposta.status, 201);
        assert.deepEqual(await resposta.json(), salvo);
        assert.match(api.consultas.at(-1).query, /ON CONFLICT \(id_usuario, id_cliente\) DO NOTHING/);
        assert.match(api.consultas.at(-1).query, /14/);
        assert.deepEqual(Array.from(api.consultas.at(-1).valores), [7, ciclo.id_cliente, ciclo.concluido_em]);
    });

    await t.test('reenvio recebe o registro original sem duplicar ou mudar a data', async () => {
        api.consulta((query) => query.includes('INSERT') ? [] : [salvo]);

        const resposta = await api.request('/calma', 'POST', ciclo);

        assert.equal(resposta.status, 200);
        assert.deepEqual(await resposta.json(), salvo);
        assert.deepEqual(Array.from(api.consultas.at(-1).valores), [7, ciclo.id_cliente]);
    });

    await t.test('histórico consulta apenas a conta autenticada e limita a resposta', async () => {
        api.resultado([salvo]);

        const resposta = await api.request('/calma');

        assert.equal(resposta.status, 200);
        assert.deepEqual(await resposta.json(), [salvo]);
        assert.match(api.consultas.at(-1).query, /WHERE id_usuario = \?/);
        assert.match(api.consultas.at(-1).query, /LIMIT 50/);
        assert.deepEqual(Array.from(api.consultas.at(-1).valores), [7]);
    });
});

test('diário mantém autenticação, CRUD e isolamento entre contas', async (t) => {
    const api = await criarServidor(t);

    await t.test('sem token, usuário alheio e dono forjado não consultam o banco', async () => {
        assert.equal((await api.request('/diario/7', 'GET', undefined, null)).status, 401);
        assert.equal((await api.request('/diario/8')).status, 403);
        assert.equal((await api.request('/diario', 'POST', { id_usuario: 8, descricao: 'texto' })).status, 403);
        assert.equal(api.consultas.length, 0);
    });

    await t.test('IDs inválidos e textos vazios ou grandes são rejeitados antes do SQL', async () => {
        assert.equal((await api.request('/diario/7abc')).status, 400);
        assert.equal((await api.request('/diario', 'POST', { descricao: '  ' })).status, 400);
        assert.equal((await api.request('/diario', 'POST', { descricao: 'x'.repeat(10001) })).status, 400);
        assert.equal((await api.request('/diario/42', 'PUT', { descricao: 'x'.repeat(10001) })).status, 400);
        assert.equal((await api.request('/diario/42abc', 'DELETE')).status, 400);
        assert.equal(api.consultas.length, 0);
    });

    await t.test('token expirado, algoritmo indevido e claims incompletos não autorizam acesso', async () => {
        const variantes = [
            jwt.sign({ id_usuario: 7 }, process.env.JWT_SECRET, { ...opcoesToken, expiresIn: '-1s' }),
            jwt.sign({ id_usuario: 7 }, process.env.JWT_SECRET, { ...opcoesToken, algorithm: 'HS512' }),
            jwt.sign({ id_usuario: 7 }, process.env.JWT_SECRET, { ...opcoesToken, audience: 'outro-app' }),
            jwt.sign({ id_usuario: 7 }, process.env.JWT_SECRET, { ...opcoesToken, issuer: 'outra-api' }),
            jwt.sign({ id_usuario: '7' }, process.env.JWT_SECRET, opcoesToken),
            jwt.sign({ id_usuario: 7 }, process.env.JWT_SECRET, { issuer: 'amparo-api', audience: 'amparo-app' }),
        ];

        for (const token of variantes) {
            assert.equal((await api.request('/diario/7', 'GET', undefined, 'Bearer ' + token)).status, 401);
        }

        assert.equal((await api.request('/diario/7', 'GET', undefined, 'Basic invalido')).status, 401);
        assert.equal(api.consultas.length, 0);
    });

    await t.test('CRUD usa sempre o usuário autenticado nas consultas', async () => {
        api.resultado([{ id_diario: 42, descricao: 'Texto', data_registro: '2026-10-14' }]);

        assert.equal((await api.request('/diario/7')).status, 200);
        assert.deepEqual(api.consultas.at(-1).valores, [7]);

        assert.equal((await api.request('/diario', 'POST', { descricao: ' Texto ' })).status, 201);
        assert.deepEqual(api.consultas.at(-1).valores, [7, 'Texto']);

        assert.equal((await api.request('/diario/42', 'PUT', { descricao: ' Editado ' })).status, 200);
        assert.deepEqual(api.consultas.at(-1).valores, ['Editado', 42, 7]);
        assert.match(api.consultas.at(-1).query, /AND id_usuario/);

        assert.equal((await api.request('/diario/42', 'DELETE')).status, 200);
        assert.deepEqual(api.consultas.at(-1).valores, [42, 7]);
        assert.match(api.consultas.at(-1).query, /AND id_usuario/);
    });

    await t.test('nota ausente ou de outra conta não pode ser editada ou excluída', async () => {
        api.resultado([]);

        assert.equal((await api.request('/diario/42', 'PUT', { descricao: 'texto' })).status, 404);
        assert.equal((await api.request('/diario/42', 'DELETE')).status, 404);
    });
});

test('calma limita os envios por conta e mantém erros do banco privados', async (t) => {
    const api = await criarServidor(t, true);
    const ciclo = {
        id_cliente: '00000000-0000-4000-8000-000000000001',
        concluido_em: new Date().toISOString(),
    };

    api.resultado([{ ...ciclo, id_calma: 1, duracao_segundos: 14 }]);

    for (let indice = 0; indice < 60; indice++) {
        assert.equal((await api.request('/calma', 'POST', ciclo)).status, 201);
    }

    const consultasAntes = api.consultas.length;

    assert.equal((await api.request('/calma', 'POST', ciclo)).status, 429);
    assert.equal(api.consultas.length, consultasAntes);

    const outraConta = jwt.sign({ id_usuario: 8 }, process.env.JWT_SECRET, opcoesToken);

    assert.equal((await api.request('/calma', 'POST', ciclo, 'Bearer ' + outraConta)).status, 201);
    assert.equal(api.consultas.at(-1).valores[0], 8);

    api.consulta(() => { throw new Error('Detalhes privados da conexão.'); });

    const falha = await api.request('/calma');

    assert.equal(falha.status, 500);
    assert.equal((await falha.json()).erro, 'Não foi possível carregar o histórico de calma.');
});

test('cadastro, login e restauração validam os dados de acesso', async (t) => {
    const api = await criarServidor(t);

    await t.test('entrada inválida e senha acima de 72 bytes não chegam ao banco', async () => {
        for (const body of [null, {}, { nome: 'Nome', email: 'invalido', senha: '12345678' },
            { nome: 'Nome', email: 'teste@example.com', senha: 'é'.repeat(37) }]) {
            assert.equal((await api.request('/usuario', 'POST', body, null)).status, 400);
        }

        assert.equal((await api.request('/login', 'POST', { email: 'teste@example.com', senha: 123 }, null)).status, 400);
        assert.equal(api.consultas.length, 0);
    });

    await t.test('cadastro normaliza e-mail e grava hash, sem devolvê-lo', async () => {
        api.consulta((query) => query.includes('INSERT') ? [{ id_usuario: 7, nome: 'Pessoa', email: 'teste@example.com' }] : []);

        const res = await api.request('/usuario', 'POST', {
            nome: ' Pessoa ',
            email: ' TESTE@EXAMPLE.COM ',
            senha: 'senha-de-teste',
        }, null);

        assert.equal(res.status, 201);
        assert.equal((await res.json()).senha, undefined);

        const valores = api.consultas.at(-1).valores;

        assert.equal(valores[0], 'Pessoa');
        assert.equal(valores[1], 'teste@example.com');
        assert.notEqual(valores[2], 'senha-de-teste');
        assert.equal(await bcrypt.compare('senha-de-teste', valores[2]), true);
    });

    await t.test('e-mail existente ou conflito no banco retorna 409', async () => {
        const body = { nome: 'Pessoa', email: 'teste@example.com', senha: 'senha-de-teste' };

        api.resultado([{ id_usuario: 7 }]);

        assert.equal((await api.request('/usuario', 'POST', body, null)).status, 409);

        api.consulta((query) => {
            if (query.includes('INSERT')) {
                throw Object.assign(new Error('Conflito de teste'), { code: '23505' });
            }

            return [];
        });

        assert.equal((await api.request('/usuario', 'POST', body, null)).status, 409);
    });

    await t.test('credenciais inválidas têm a mesma resposta e login válido emite JWT esperado', async () => {
        const body = { email: 'teste@example.com', senha: 'senha-de-teste' };

        api.resultado([]);

        const ausente = await api.request('/login', 'POST', body, null);
        const mensagem = await ausente.json();

        assert.equal(ausente.status, 401);

        const usuario = {
            id_usuario: 7,
            nome: 'Pessoa',
            email: 'teste@example.com',
            senha: await bcrypt.hash('outra-senha', 10),
        };

        api.resultado([usuario]);

        const incorreto = await api.request('/login', 'POST', body, null);

        assert.equal(incorreto.status, 401);
        assert.deepEqual(await incorreto.json(), mensagem);

        usuario.senha = await bcrypt.hash(body.senha, 10);

        const valido = await api.request('/login', 'POST', { ...body, email: ' TESTE@EXAMPLE.COM ' }, null);
        const dados = await valido.json();

        assert.equal(valido.status, 200);
        assert.equal(dados.usuario.senha, undefined);
        assert.equal(api.consultas.at(-1).valores[0], 'teste@example.com');
        assert.equal(jwt.verify(dados.token, process.env.JWT_SECRET, {
            algorithms: ['HS256'], issuer: 'amparo-api', audience: 'amparo-app',
        }).id_usuario, 7);
    });

    await t.test('sessão requer token e uma conta existente, sem devolver o hash', async () => {
        assert.equal((await api.request('/sessao', 'GET', undefined, null)).status, 401);

        api.resultado([]);

        assert.equal((await api.request('/sessao')).status, 401);

        api.resultado([{ id_usuario: 7, nome: 'Pessoa', email: 'teste@example.com', senha: 'hash-de-teste' }]);

        const res = await api.request('/sessao');
        const dados = await res.json();

        assert.equal(res.status, 200);
        assert.equal(dados.usuario.id_usuario, 7);
        assert.equal(dados.usuario.senha, undefined);
    });
});

test('API limita tentativas e protege respostas e origens', async (t) => {
    const api = await criarServidor(t, true);

    await t.test('origem autorizada e app nativo recebem headers de segurança', async () => {
        const res = await api.request('/sessao', 'GET', undefined, null, { Origin: 'https://app.example.com' });

        assert.equal(res.status, 401);
        assert.equal(res.headers.get('access-control-allow-origin'), 'https://app.example.com');
        assert.equal(res.headers.get('x-powered-by'), null);
        assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
        assert.equal(res.headers.get('cache-control'), 'no-store');
        assert.equal((await api.request('/sessao', 'GET', undefined, null)).status, 401);
    });

    await t.test('origem externa, JSON inválido e payload grande são rejeitados', async () => {
        assert.equal((await api.request('/sessao', 'GET', undefined, null, { Origin: 'https://externo.example.com' })).status, 403);

        const invalido = await fetch(api.base + '/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: '{json-invalido',
        });

        assert.equal(invalido.status, 400);
        assert.equal((await api.request('/diario', 'POST', { descricao: 'x'.repeat(70000) })).status, 413);
    });

    await t.test('excesso de tentativas retorna 429 mesmo com X-Forwarded-For forjado', async () => {
        let resposta;

        // A tentativa com JSON inválido já consumiu uma posição do limite.
        for (let indice = 0; indice < 10; indice++) {
            resposta = await api.request('/login', 'POST', {}, null, {
                'X-Forwarded-For': '198.51.100.' + indice,
            });
        }

        assert.equal(resposta.status, 429);
        assert.ok(resposta.headers.get('retry-after'));
    });
});

test('configuração inválida falha sem revelar credenciais', async () => {
    const { validarAmbiente } = await import('../src/config/env.js');
    const base = {
        DATABASE_URL: 'postgresql://teste:teste@example.com/banco',
        JWT_SECRET: 'segredo-aleatorio-exclusivo-de-teste',
    };

    assert.equal(validarAmbiente(base).porta, 3000);
    assert.throws(() => validarAmbiente({ ...base, JWT_SECRET: 'curto' }), /JWT_SECRET/);
    assert.throws(() => validarAmbiente({ ...base, JWT_SECRET: ' '.repeat(40) }), /JWT_SECRET/);
    assert.throws(() => validarAmbiente({ ...base, DATABASE_URL: 'conexao-invalida' }), /DATABASE_URL/);
    assert.throws(() => validarAmbiente({ ...base, PORT: '-1' }), /PORT/);
    assert.throws(() => validarAmbiente({ ...base, NODE_ENV: 'production' }), /CORS_ORIGINS/);
    assert.throws(() => validarAmbiente({ ...base, NODE_ENV: 'production', CORS_ORIGINS: '*' }), /CORS_ORIGINS/);
    assert.throws(() => validarAmbiente({ ...base, NODE_ENV: 'production', CORS_ORIGINS: 'http://app.example.com' }), /HTTPS/);

    assert.deepEqual(validarAmbiente({
        ...base,
        NODE_ENV: 'production',
        CORS_ORIGINS: 'https://app.example.com',
        TRUST_PROXY_HOPS: '1',
    }).origensPermitidas, ['https://app.example.com']);
});

test('registros emocionais exigem autenticação e dados definidos pelo servidor', async (t) => {
    const api = await criarServidor(t, true);

    assert.equal((await api.request('/emocoes', 'GET', undefined, null)).status, 401);
    assert.equal((await api.request('/emocoes', 'POST', { id_emocao: 'Feliz' }, null)).status, 401);
    assert.equal((await api.request('/emocoes', 'POST', { id_usuario: 8, id_emocao: 'Feliz' })).status, 403);

    for (const id_emocao of [undefined, null, 1, [], {}, 'feliz', 'Ansioso', 'toString']) {
        assert.equal((await api.request('/emocoes', 'POST', { id_emocao })).status, 400);
    }

    for (const campo of ['data_registro', 'hora_registro', 'registrado_em', 'id_registro_emocao']) {
        const resposta = await api.request('/emocoes', 'POST', { id_emocao: 'Feliz', id_cliente: randomUUID(), [campo]: 'forjado' });
        assert.equal(resposta.status, 400);
    }

    assert.equal(api.consultas.length, 0);
});

test('emoções aceitam vários registros no mesmo dia e consultam somente a conta autenticada', async (t) => {
    const api = await criarServidor(t, true);
    const registros = [];

    api.consulta((query, valores) => {
        if (query.includes('INSERT')) {
            const registro = {
                id_registro_emocao: registros.length + 1,
                id_usuario: valores[0],
                id_emocao: valores[1],
                data_registro: '2026-10-14',
                hora_registro: '02:30:00',
                registrado_em: '2026-10-14T02:30:00.000Z',
            };

            registros.push(registro);

            return [registro];
        }

        return registros.filter((registro) => registro.id_usuario === valores[0]).reverse();
    });

    for (const id_emocao of ['Feliz', 'Triste', 'Neutro', 'Raiva', 'Feliz']) {
        const id_cliente = randomUUID();
        const resposta = await api.request('/emocoes', 'POST', { id_emocao, id_cliente });
        const registro = await resposta.json();

        assert.equal(resposta.status, 201);
        assert.equal(registro.id_usuario, 7);
        assert.equal(registro.id_emocao, id_emocao);
        assert.equal(registro.data_registro, '2026-10-14');
        assert.equal(registro.hora_registro, '02:30:00');
        assert.deepEqual(api.consultas.at(-1).valores, [7, id_emocao, id_cliente]);
        assert.match(api.consultas.at(-1).query, /ON CONFLICT \(id_usuario, id_cliente\) DO NOTHING/);
    }

    assert.equal(new Set(registros.map((registro) => registro.id_registro_emocao)).size, 5);
    assert.equal((await (await api.request('/emocoes?id_usuario=8')).json()).length, 5);
    assert.deepEqual(api.consultas.at(-1).valores, [7]);
    assert.match(api.consultas.at(-1).query, /WHERE id_usuario/);
    assert.match(api.consultas.at(-1).query, /ORDER BY registro_emocional.data_registro DESC, id_registro_emocao DESC/);

    const tokenOutraConta = jwt.sign({ id_usuario: 8 }, process.env.JWT_SECRET, opcoesToken);
    const cabecalho = 'Bearer ' + tokenOutraConta;

    assert.deepEqual(await (await api.request('/emocoes', 'GET', undefined, cabecalho)).json(), []);
    assert.deepEqual(api.consultas.at(-1).valores, [8]);
    assert.equal((await api.request('/emocoes', 'POST', { id_emocao: 'Triste', id_cliente: randomUUID() }, cabecalho)).status, 201);
    assert.equal((await (await api.request('/emocoes', 'GET', undefined, cabecalho)).json()).length, 1);
    assert.equal((await (await api.request('/emocoes')).json()).length, 5);
});

test('falhas no banco de emoções retornam erro sem divulgar informações internas', async (t) => {
    const api = await criarServidor(t, true);

    api.consulta(() => { throw new Error('Detalhes internos que não devem aparecer'); });

    for (const [metodo, body] of [['GET', undefined], ['POST', { id_emocao: 'Feliz', id_cliente: randomUUID() }]]) {
        const resposta = await api.request('/emocoes', metodo, body);

        assert.equal(resposta.status, 500);
        assert.doesNotMatch(JSON.stringify(await resposta.json()), /Detalhes internos/);
    }
});

test('reenvio da confirmação recupera a emoção original e rejeita mudança de conteúdo', async (t) => {
    const api = await criarServidor(t, true);
    const id_cliente = randomUUID();
    const original = { id_registro_emocao: 9, id_usuario: 7, id_emocao: 'Feliz', registrado_em: '2026-10-14T02:30:00.123Z' };
    api.consulta((query) => query.includes('INSERT') ? [] : [original]);

    const resposta = await api.request('/emocoes', 'POST', { id_emocao: 'Feliz', id_cliente });
    assert.equal(resposta.status, 200);
    assert.deepEqual(await resposta.json(), original);
    assert.deepEqual(api.consultas.at(-1).valores, [7, id_cliente]);
    assert.equal((await api.request('/emocoes', 'POST', { id_emocao: 'Triste', id_cliente })).status, 409);

    for (const invalido of [undefined, null, 123, [], 'nao-uuid']) {
        assert.equal((await api.request('/emocoes', 'POST', { id_emocao: 'Feliz', id_cliente: invalido })).status, 400);
    }
});

test('perfil altera apenas o nome da própria conta e não aceita campos de autenticação', async (t) => {
    const api = await criarServidor(t, true);
    assert.equal((await api.request('/perfil', 'PUT', { nome: 'Novo nome' }, null)).status, 401);
    for (const payload of [{ nome: ' ' }, { nome: 'x'.repeat(101) }, { nome: 'Novo', id_usuario: 8 }, { nome: 'Novo', senha: 'forjada' }]) {
        assert.equal((await api.request('/perfil', 'PUT', payload)).status, 400);
    }
    assert.equal(api.consultas.length, 0);
    api.resultado([{ id_usuario: 7, nome: 'Novo nome', email: 'teste@example.com' }]);
    const resposta = await api.request('/perfil', 'PUT', { nome: ' Novo nome ' });
    assert.equal(resposta.status, 200);
    assert.deepEqual(api.consultas.at(-1).valores, ['Novo nome', 7]);
    assert.match(api.consultas.at(-1).query, /WHERE id_usuario/);
    assert.equal((await resposta.json()).usuario.nome, 'Novo nome');
    api.resultado([]);
    assert.equal((await api.request('/perfil', 'PUT', { nome: 'Novo' })).status, 401);
});
