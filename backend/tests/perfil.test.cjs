const test = require('node:test');
const assert = require('node:assert/strict');
const { criarAmbienteSono } = require('./helpers/servidor-sono.cjs');

let api;

test.before(async () => { api = await criarAmbienteSono(); });
test.after(async () => { await api?.encerrar(); });

test('perfil exige uma conta válida e consulta somente o usuário do JWT', async () => {
    for (const id of [null, 99, '7']) {
        assert.equal((await api.request('/perfil', 'GET', undefined, id)).status, 401);
    }

    const resposta = await api.request('/perfil?id_usuario=8');
    const { usuario } = await resposta.json();

    assert.equal(resposta.status, 200);
    assert.deepEqual(usuario, {
        id_usuario: 7, nome: 'Pessoa de teste', email: 'sono@example.com', st_notificacao: true, foto_url: null,
    });
    assert.deepEqual(api.estado.consultas.at(-1).valores, [7]);
    assert.equal(Object.hasOwn(usuario, 'senha'), false);
});

test('notificações persistem no banco, na sessão e no próximo login sem alterar outra conta', async () => {
    for (const valor of [false, true, false]) {
        const resposta = await api.request('/perfil/notificacoes', 'PUT', { st_notificacao: valor });

        assert.equal(resposta.status, 200);
        assert.equal((await resposta.json()).usuario.st_notificacao, valor);
        assert.equal((await api.banco.query('SELECT st_notificacao FROM usuario WHERE id_usuario = 7')).rows[0].st_notificacao, valor);

        for (const rota of ['/perfil', '/sessao']) {
            assert.equal((await (await api.request(rota)).json()).usuario.st_notificacao, valor);
        }

        const outraConta = await api.request('/perfil', 'GET', undefined, 8);
        assert.equal((await outraConta.json()).usuario.st_notificacao, true);
    }

    const login = await api.request('/login', 'POST', { email: 'sono@example.com', senha: 'teste1234' }, null);
    const dados = await login.json();

    assert.equal(login.status, 200);
    assert.equal(dados.usuario.st_notificacao, false);
    assert.equal(Object.hasOwn(dados.usuario, 'senha'), false);

    const edicao = await api.request('/perfil', 'PUT', { nome: ' Nome atualizado ' });
    const { usuario } = await edicao.json();

    assert.equal(edicao.status, 200);
    assert.equal(usuario.nome, 'Nome atualizado');
    assert.equal(usuario.st_notificacao, false);
    assert.equal((await (await api.request('/perfil', 'GET', undefined, 8)).json()).usuario.nome, 'Outra conta');
});

test('preferências rejeitam valores inválidos e campos extras antes de consultar o banco', async () => {
    const total = api.estado.consultas.length;

    for (const body of [{}, null, [], { st_notificacao: null }, { st_notificacao: 0 },
        { st_notificacao: 'false' }, { st_notificacao: true, id_usuario: 8 },
        { st_notificacao: true, nome: 'Forjado' }, { st_notificacao: false, senha: 'forjada' }]) {
        assert.equal((await api.request('/perfil/notificacoes', 'PUT', body)).status, 400);
    }

    assert.equal((await api.request('/perfil/notificacoes', 'PUT', { st_notificacao: true }, null)).status, 401);
    assert.equal(api.estado.consultas.length, total);
    assert.equal((await api.request('/perfil/notificacoes', 'PUT', { st_notificacao: true }, 99)).status, 401);
});

test('falhas do banco não confirmam alterações nem expõem detalhes internos', async () => {
    api.estado.falhar = true;

    try {
        for (const [rota, metodo, body] of [['/perfil', 'GET'], ['/perfil', 'PUT', { nome: 'Novo' }],
            ['/perfil/notificacoes', 'PUT', { st_notificacao: true }]]) {
            const resposta = await api.request(rota, metodo, body);

            assert.equal(resposta.status, 500);
            assert.doesNotMatch(JSON.stringify(await resposta.json()), /privado|senha|SELECT|UPDATE/);
        }
    } finally {
        api.estado.falhar = false;
    }

    assert.equal((await (await api.request('/perfil')).json()).usuario.st_notificacao, false);
});
