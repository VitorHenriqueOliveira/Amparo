const test = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { criarAmbienteEmocoes } = require('./helpers/servidor-emocoes.cjs');

test('registro emocional integra HTTP, JWT e PostgreSQL com as migrações reais', async (t) => {
    const api = await criarAmbienteEmocoes();
    t.after(() => api.encerrar());

    await t.test('valida autenticação, proprietário e dados antes de gravar', async () => {
        assert.equal((await api.request('/emocoes', 'GET', undefined, null)).status, 401);
        assert.equal((await api.request('/emocoes', 'POST', {}, null)).status, 401);
        assert.equal((await api.request('/emocoes', 'POST', { id_usuario: 8, id_emocao: 'Feliz', id_cliente: randomUUID() })).status, 403);
        for (const dados of [
            {}, { id_emocao: 'Ansioso', id_cliente: randomUUID() },
            { id_emocao: 'Feliz', id_cliente: 'invalido' },
            { id_emocao: 'Feliz', id_cliente: randomUUID(), data_registro: '2000-01-01' },
        ]) assert.equal((await api.request('/emocoes', 'POST', dados)).status, 400);
        assert.equal(api.estado.consultas.length, 0);
    });

    await t.test('salva as quatro emoções com o instante e a hora gerados pelo banco', async () => {
        for (const emocao of ['Feliz', 'Triste', 'Neutro', 'Raiva']) {
            const antes = Date.now();
            const resposta = await api.request('/emocoes', 'POST', { id_emocao: emocao, id_cliente: randomUUID() });
            assert.equal(resposta.status, 201);
            const salvo = await resposta.json();
            assert.equal(salvo.id_usuario, 7);
            assert.equal(salvo.id_emocao, emocao);
            const instante = new Date(salvo.registrado_em);
            assert.ok(instante.getTime() >= antes && instante.getTime() <= Date.now());
            assert.equal(salvo.data_registro, instante.toISOString().slice(0, 10));
            assert.equal(salvo.hora_registro.slice(0, 8), instante.toISOString().slice(11, 19));
        }
        assert.equal((await (await api.request('/emocoes')).json()).length, 4);
    });

    await t.test('reenvios simultâneos produzem somente um registro e preservam seu instante', async () => {
        const body = { id_emocao: 'Feliz', id_cliente: randomUUID() };
        const respostas = await Promise.all(Array.from({ length: 6 }, () => api.request('/emocoes', 'POST', body)));
        assert.equal(respostas.filter((resposta) => resposta.status === 201).length, 1);
        assert.equal(respostas.filter((resposta) => resposta.status === 200).length, 5);
        const registros = await Promise.all(respostas.map((resposta) => resposta.json()));
        assert.equal(new Set(registros.map((registro) => registro.id_registro_emocao)).size, 1);
        assert.equal(new Set(registros.map((registro) => registro.registrado_em)).size, 1);
        assert.equal((await api.request('/emocoes', 'POST', { ...body, id_emocao: 'Triste' })).status, 409);
        assert.equal((await (await api.request('/emocoes')).json()).length, 5);
    });

    await t.test('cada conta lê e confirma somente as próprias emoções', async () => {
        const [existente] = (await api.banco.query('SELECT id_cliente FROM registro_emocional WHERE id_cliente IS NOT NULL LIMIT 1')).rows;
        assert.equal((await api.request('/emocoes', 'POST', { id_emocao: 'Triste', id_cliente: existente.id_cliente }, 8)).status, 201);
        const proprias = await (await api.request('/emocoes?id_usuario=8')).json();
        assert.equal(proprias.length, 5);
        assert.ok(proprias.every((registro) => registro.id_usuario === 7));
        const outras = await (await api.request('/emocoes', 'GET', undefined, 8)).json();
        assert.equal(outras.length, 1);
        assert.equal(outras[0].id_usuario, 8);
        const ids = proprias.map((registro) => registro.id_registro_emocao);
        assert.deepEqual(ids, [...ids].sort((a, b) => b - a));
    });

    await t.test('falhas não inventam sucesso, não vazam detalhes e permitem tentar novamente', async () => {
        api.estado.falhar = true;
        const body = { id_emocao: 'Neutro', id_cliente: randomUUID() };
        for (const [metodo, dados] of [['GET', undefined], ['POST', body]]) {
            const resposta = await api.request('/emocoes', metodo, dados);
            assert.equal(resposta.status, 500);
            assert.doesNotMatch(await resposta.text(), /Detalhe privado|SELECT|INSERT|stack/);
        }
        api.estado.falhar = false;
        assert.equal((await api.request('/emocoes', 'POST', body)).status, 201);
        assert.equal((await (await api.request('/emocoes')).json()).length, 6);
    });
});
