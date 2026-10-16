const test = require('node:test');
const assert = require('node:assert/strict');
const { criarAmbienteSono } = require('./helpers/servidor-sono.cjs');

let api;
const parametros = 'inicio=2026-10-14&fim=2026-10-14&fuso_horario=America/Sao_Paulo';
const listar = (query = parametros, id = 7) => api.request('/diario/periodo?' + query, 'GET', undefined, id);
const relatorio = (query = parametros, id = 7) => api.request('/emocoes/evolucao?' + query, 'GET', undefined, id);

test.before(async () => { api = await criarAmbienteSono(); });
test.after(async () => { await api?.encerrar(); });

test('leitura do diário por período exige autenticação e valida filtros antes de consultar o banco', async () => {
    const antes = api.estado.consultas.length;
    assert.equal((await listar(parametros, null)).status, 401);

    for (const query of ['', parametros + '&id_usuario=8', parametros + '&pagina=0', parametros + '&pagina=1.5',
        parametros + '&pagina=1&pagina=2', parametros + '&pagina=1000001',
        'inicio=2026-02-30&fim=2026-03-01&fuso_horario=UTC',
        'inicio=2026-10-15&fim=2026-10-14&fuso_horario=UTC',
        'inicio=2024-01-01&fim=2026-10-14&fuso_horario=UTC',
        'inicio=2026-10-14&fim=2026-10-14&fuso_horario=Invalido']) {
        assert.equal((await listar(query)).status, 400);
    }

    assert.equal(api.estado.consultas.length, antes);
    assert.equal((await listar(parametros, 99)).status, 401);
});

test('notas sem emoções aparecem no resumo e na leitura, com limites locais e isolamento entre contas', async () => {
    await api.banco.exec(`INSERT INTO diario (id_usuario, descricao, data_registro) VALUES
        (7, 'Antes do período', '2026-10-14T02:59:59.999999Z'),
        (7, 'Primeira nota', '2026-10-14T03:00:00Z'),
        (7, 'Última nota', '2026-10-15T02:59:59.999999Z'),
        (7, 'Depois do período', '2026-10-15T03:00:00Z'),
        (8, 'Nota privada de outra conta', '2026-10-14T12:00:00Z');`);

    const resposta = await listar();
    assert.equal(resposta.status, 200);
    const dados = await resposta.json();
    assert.equal(dados.total, 2);
    assert.deepEqual(dados.notas.map((nota) => nota.descricao), ['Última nota', 'Primeira nota']);
    assert.equal(Object.hasOwn(dados.notas[0], 'id_usuario'), false);
    const evolucao = await (await relatorio()).json();
    assert.equal(evolucao.total, 0);
    assert.deepEqual(evolucao.diario, { total: 2, diasComRegistros: 1 });
    assert.equal(evolucao.dias[0].quantidadeNotas, 2);
    assert.equal(evolucao.dias[0].emocao, null);
    assert.equal(evolucao.conselho.titulo, 'Seu diário faz parte da sua evolução');
    assert.equal((await (await listar(parametros, 8)).json()).total, 1);

    const vazio = await (await listar('inicio=2026-01-01&fim=2026-01-01&fuso_horario=UTC')).json();
    assert.equal(vazio.total, 0);
    assert.equal(vazio.totalPaginas, 0);
    assert.deepEqual(vazio.notas, []);
});

test('paginação mantém todos os textos e ordenação estável, inclusive com instantes iguais', async () => {
    await api.banco.exec(`INSERT INTO diario (id_usuario, descricao, data_registro)
        SELECT 7, 'Registro completo ' || indice || E'\nSegunda linha preservada.', '2026-12-01T12:00:00Z'
        FROM generate_series(1, 45) indice;`);
    const query = 'inicio=2026-12-01&fim=2026-12-01&fuso_horario=UTC';
    const ids = [];

    for (const pagina of [1, 2, 3]) {
        const dados = await (await listar(query + '&pagina=' + pagina)).json();
        assert.equal(dados.total, 45);
        assert.equal(dados.totalPaginas, 3);
        assert.equal(dados.notas.length, pagina === 3 ? 5 : 20);
        assert.match(dados.notas[0].descricao, /Segunda linha preservada/);
        ids.push(...dados.notas.map((nota) => nota.id_diario));
    }

    assert.equal(new Set(ids).size, 45);
    assert.deepEqual(ids, [...ids].sort((a, b) => b - a));
    assert.equal((await (await listar(query + '&pagina=4')).json()).notas.length, 0);
});

test('criar, editar e excluir no diário atualiza os textos e totais da evolução', async () => {
    const criacao = await api.request('/diario', 'POST', { descricao: 'Registro criado pela API' });
    assert.equal(criacao.status, 201);
    const nota = await criacao.json();
    const dia = new Date(nota.data_registro).toISOString().slice(0, 10);
    const query = `inicio=${dia}&fim=${dia}&fuso_horario=UTC`;
    const totalComNota = (await (await relatorio(query)).json()).totalNotas;
    assert.ok(totalComNota > 0);
    assert.equal((await api.request('/diario/' + nota.id_diario, 'PUT', { descricao: 'Texto atualizado' })).status, 200);
    const leitura = await (await listar(query)).json();
    assert.equal(leitura.notas.find((item) => item.id_diario === nota.id_diario).descricao, 'Texto atualizado');
    assert.equal((await (await relatorio(query)).json()).totalNotas, totalComNota);
    assert.equal((await api.request('/diario/' + nota.id_diario, 'DELETE')).status, 200);
    assert.equal((await (await listar(query)).json()).total, totalComNota - 1);
    assert.equal((await (await relatorio(query)).json()).totalNotas, totalComNota - 1);
});

test('falha da leitura retorna erro e não divulga conteúdo nem detalhes internos', async () => {
    api.estado.falhar = true;
    try {
        const resposta = await listar();
        assert.equal(resposta.status, 500);
        assert.doesNotMatch(await resposta.text(), /privado|SELECT|Primeira nota/);
    } finally {
        api.estado.falhar = false;
    }
});
