const test = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcrypt');
const { criarAmbienteSono } = require('./helpers/servidor-sono.cjs');

test('cadastro persiste a conta e seus padrões e permite login e consulta do perfil', async (t) => {
    const api = await criarAmbienteSono();
    t.after(() => api.encerrar());
    const senha = 'é'.repeat(36);
    const nome = 'N'.repeat(100);
    const email = 'a'.repeat(138) + '@example.com';
    const antes = Date.now();
    const resposta = await api.request('/usuario', 'POST', {
        nome: ' ' + nome + ' ', email: ' ' + email.toUpperCase() + ' ', senha,
    }, null);
    const conta = await resposta.json();

    assert.equal(resposta.status, 201);
    assert.equal(conta.nome, nome);
    assert.equal(conta.email, email);
    assert.ok(Number.isSafeInteger(conta.id_usuario) && conta.id_usuario > 0);
    assert.deepEqual(Object.keys(conta).sort(), ['data_cadastro', 'email', 'id_usuario', 'nome']);
    assert.equal(resposta.headers.get('cache-control'), 'no-store');
    assert.ok(Date.parse(conta.data_cadastro) >= antes && Date.parse(conta.data_cadastro) <= Date.now());

    const [salvo] = (await api.banco.query('SELECT * FROM usuario WHERE id_usuario = $1', [conta.id_usuario])).rows;

    assert.equal(salvo.nome, nome);
    assert.equal(salvo.email, email);
    assert.notEqual(salvo.senha, senha);
    assert.equal(await bcrypt.compare(senha, salvo.senha), true);
    assert.equal(salvo.st_notificacao, true);
    assert.equal(salvo.meta_sono_horas_min, 7);
    assert.equal(salvo.meta_sono_horas_max, 8);

    const login = await api.request('/login', 'POST', { email: ' ' + email.toUpperCase() + ' ', senha }, null);
    const sessao = await login.json();

    assert.equal(login.status, 200);
    assert.deepEqual(sessao.usuario, { id_usuario: conta.id_usuario, nome, email, st_notificacao: true, foto_url: null });
    assert.ok(sessao.token);

    for (const rota of ['/sessao', '/perfil']) {
        const consulta = await fetch(api.base + rota, { headers: { Authorization: 'Bearer ' + sessao.token } });

        assert.equal(consulta.status, 200);
        assert.deepEqual((await consulta.json()).usuario, sessao.usuario);
    }

    const outraConta = await api.request('/perfil', 'GET', undefined, 7);

    assert.equal((await outraConta.json()).usuario.email, 'sono@example.com');
});

test('cadastros simultâneos com variações do mesmo e-mail criam somente uma conta', async (t) => {
    const api = await criarAmbienteSono();
    t.after(() => api.encerrar());
    const senha = 'senha-de-teste';
    const emails = ['nova@example.com', 'NOVA@EXAMPLE.COM', ' nova@example.com ', ' NoVa@Example.Com '];
    const respostas = await Promise.all(emails.map((email) => api.request('/usuario', 'POST', {
        nome: 'Nova conta', email, senha,
    }, null)));

    assert.deepEqual(respostas.map((resposta) => resposta.status).sort(), [201, 409, 409, 409]);

    for (const resposta of respostas) {
        const dados = await resposta.json();

        if (resposta.status === 409) assert.deepEqual(dados, { erro: 'Este e-mail já está em uso.' });
        assert.doesNotMatch(JSON.stringify(dados), /senha-de-teste|\$2[aby]\$|INSERT|SELECT|23505|stack/);
    }

    const contas = (await api.banco.query("SELECT * FROM usuario WHERE lower(trim(email)) = 'nova@example.com'")).rows;

    assert.equal(contas.length, 1);
    assert.equal(contas[0].email, 'nova@example.com');
    assert.equal(await bcrypt.compare(senha, contas[0].senha), true);
    await assert.rejects(api.banco.query('INSERT INTO usuario (nome, email, senha) VALUES ($1, $2, $3)',
        ['Duplicada', ' NOVA@EXAMPLE.COM ', contas[0].senha]), (error) => error.code === '23505');
});

test('falha do banco não confirma cadastro nem expõe detalhes e permite tentar novamente', async (t) => {
    const api = await criarAmbienteSono();
    t.after(() => api.encerrar());
    const cadastro = { nome: 'Nova conta', email: 'nova@example.com', senha: 'senha-de-teste' };
    api.estado.falhar = true;

    const falha = await api.request('/usuario', 'POST', cadastro, null);

    assert.equal(falha.status, 500);
    assert.deepEqual(await falha.json(), { erro: 'Erro interno no servidor.' });
    assert.equal((await api.banco.query("SELECT count(*)::int AS total FROM usuario WHERE email = 'nova@example.com'")).rows[0].total, 0);
    api.estado.falhar = false;

    assert.equal((await api.request('/usuario', 'POST', cadastro, null)).status, 201);
    assert.equal((await api.banco.query("SELECT count(*)::int AS total FROM usuario WHERE email = 'nova@example.com'")).rows[0].total, 1);
});

test('cadastro limita tentativas por IP sem consultar o banco nem aceitar IP forjado', async (t) => {
    const api = await criarAmbienteSono();
    t.after(() => api.encerrar());

    for (let tentativa = 0; tentativa < 6; tentativa++) {
        const resposta = await fetch(api.base + '/usuario', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '198.51.100.' + tentativa },
            body: '{}',
        });

        assert.equal(resposta.status, tentativa < 5 ? 400 : 429);

        if (tentativa === 5) {
            assert.ok(Number(resposta.headers.get('retry-after')) > 0);
            assert.equal(resposta.headers.get('cache-control'), 'no-store');
            assert.deepEqual(await resposta.json(), { erro: 'Muitas tentativas de cadastro. Aguarde e tente novamente.' });
        }
    }

    assert.equal(api.estado.consultas.length, 0);
});
