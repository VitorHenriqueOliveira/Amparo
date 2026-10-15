const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { PGlite } = require('@electric-sql/pglite');
const { criarAmbienteSono } = require('./helpers/servidor-sono.cjs');

test('sono usa HTTP, JWT e PostgreSQL reais sem acessar o Neon', async (t) => {
    const api = await criarAmbienteSono();
    t.after(() => api.encerrar());
    const ler = async (fuso = 'America/Sao_Paulo', id = 7) =>
        (await api.request('/sono?fuso_horario=' + encodeURIComponent(fuso), 'GET', undefined, id)).json();
    const hoje = (await ler()).hoje;
    const corpo = { hora_dormiu: '23:45', hora_acordou: '07:15', fuso_horario: 'America/Sao_Paulo', dia_referencia: hoje };

    await t.test('rotas privadas exigem autenticação e impedem dono forjado', async () => {
        const antes = api.estado.consultas.length;
        for (const [rota, metodo, body] of [
            ['/sono', 'GET'], ['/sono/historico', 'GET'], ['/sono', 'POST', corpo],
            ['/sono/meta', 'PUT', { meta_sono_horas_min: 7, meta_sono_horas_max: 8 }],
        ]) assert.equal((await api.request(rota, metodo, body, null)).status, 401);
        assert.equal((await api.request('/sono', 'POST', { ...corpo, id_usuario: 8 })).status, 403);
        assert.equal(api.estado.consultas.length, antes);
    });

    await t.test('sem registro retorna nulo e meta pessoal, com o dia calculado pelo servidor', async () => {
        const dados = await ler();
        assert.equal(dados.registro, null);
        assert.equal(dados.meta_sono_horas_min, 7);
        assert.equal(dados.meta_sono_horas_max, 8);
        const [sql] = (await api.banco.query("SELECT (statement_timestamp() AT TIME ZONE 'America/Sao_Paulo')::date::text AS hoje")).rows;
        assert.equal(dados.hoje, sql.hoje);
        const intervalo = Date.parse(dados.proxima_atualizacao_em) - Date.parse(dados.agora);
        assert.ok(intervalo > 0 && intervalo <= 25 * 3600000);
        assert.equal((await api.request('/sono?fuso_horario=Invalido')).status, 400);
        assert.equal((await api.request('/sono?fuso_horario=%2B03%3A00')).status, 400);
        assert.equal((await api.request('/sono')).status, 400);
    });

    await t.test('horas inválidas, campos extras e data forjada são rejeitados', async () => {
        for (const alteracao of [
            { hora_dormiu: '24:00' }, { hora_acordou: '7:15' }, { hora_dormiu: '07:15' },
            { hora_dormiu: null }, { hora_acordou: ['07:15'] }, { fuso_horario: 'Invalido' },
            { dia_referencia: '2026-02-30' }, { data_registro: '2020-01-01' }, { duracao: 900 },
        ]) assert.equal((await api.request('/sono', 'POST', { ...corpo, ...alteracao })).status, 400);
        const resposta = await api.request('/sono', 'POST', { ...corpo, dia_referencia: '2000-01-01' });
        assert.equal(resposta.status, 409);
        assert.equal((await resposta.json()).codigo, 'DIA_ALTERADO');
        assert.equal((await api.banco.query('SELECT count(*)::int AS n FROM sono')).rows[0].n, 0);
    });

    await t.test('criação, reenvio simultâneo e edição mantêm um único registro no dia', async () => {
        const respostas = await Promise.all([api.request('/sono', 'POST', corpo), api.request('/sono', 'POST', corpo)]);
        assert.deepEqual(respostas.map((resposta) => resposta.status), [200, 200]);
        const primeiro = await respostas[0].json();
        assert.equal(primeiro.data_registro, hoje);
        assert.equal(primeiro.hora_dormiu, '23:45');
        assert.equal(primeiro.hora_acordou, '07:15');
        const editado = await (await api.request('/sono', 'POST', { ...corpo, hora_dormiu: '22:00' })).json();
        assert.equal(editado.id_sono, primeiro.id_sono);
        assert.equal(editado.hora_dormiu, '22:00');
        assert.equal((await api.banco.query('SELECT count(*)::int AS n FROM sono')).rows[0].n, 1);
        assert.equal((await ler()).registro.id_sono, primeiro.id_sono);
    });

    await t.test('outra conta não lê nem altera o registro e o histórico preserva os dias', async () => {
        assert.equal((await ler('America/Sao_Paulo', 8)).registro, null);
        assert.deepEqual(await (await api.request('/sono/historico', 'GET', undefined, 8)).json(), []);
        await api.banco.query("INSERT INTO sono (id_usuario, hora_dormiu, hora_acordou, data_registro) VALUES (7, '23:00', '06:00', $1::date - 1)", [hoje]);
        const historico = await (await api.request('/sono/historico')).json();
        assert.equal(historico.length, 2);
        assert.equal(historico[0].data_registro, hoje);
    });

    await t.test('meta é ajustável e persistida somente para o usuário autenticado', async () => {
        for (const [min, max] of [[0, 8], [8, 7], [7, 25], [7.5, 8], ['7', 8], [null, 8]]) {
            assert.equal((await api.request('/sono/meta', 'PUT', { meta_sono_horas_min: min, meta_sono_horas_max: max })).status, 400);
        }
        assert.equal((await api.request('/sono/meta', 'PUT', { meta_sono_horas_min: 6, meta_sono_horas_max: 9, id_usuario: 8 })).status, 400);
        assert.equal((await api.request('/sono/meta', 'PUT', { meta_sono_horas_min: 6, meta_sono_horas_max: 9 })).status, 200);
        assert.equal((await ler()).meta_sono_horas_min, 6);
        assert.equal((await ler('UTC', 8)).meta_sono_horas_min, 7);
        assert.equal((await ler()).meta_sono_horas_max, 9);
    });

    await t.test('fusos em lados opostos da meia-noite recebem o próprio dia', async () => {
        const leste = await ler('Pacific/Kiritimati');
        const oeste = await ler('Etc/GMT+12');
        assert.notEqual(leste.hoje, oeste.hoje);
        for (const [fuso, dados] of [['Pacific/Kiritimati', leste], ['Etc/GMT+12', oeste]]) {
            const [esperado] = (await api.banco.query('SELECT (statement_timestamp() AT TIME ZONE $1)::date::text AS dia', [fuso])).rows;
            assert.equal(dados.hoje, esperado.dia);
        }
    });

    await t.test('conta removida recebe 401 e falhas do banco mantêm detalhes privados', async () => {
        assert.equal((await api.request('/sono?fuso_horario=UTC', 'GET', undefined, 99)).status, 401);
        assert.equal((await api.request('/sono', 'POST', corpo, 99)).status, 401);
        assert.equal((await api.request('/sono/meta', 'PUT', { meta_sono_horas_min: 7, meta_sono_horas_max: 8 }, 99)).status, 401);
        api.estado.falhar = true;
        for (const [rota, metodo, body] of [
            ['/sono?fuso_horario=UTC', 'GET'], ['/sono/historico', 'GET'],
            ['/sono', 'POST', corpo], ['/sono/meta', 'PUT', { meta_sono_horas_min: 7, meta_sono_horas_max: 8 }],
        ]) {
            const resposta = await api.request(rota, metodo, body);
            assert.equal(resposta.status, 500);
            assert.doesNotMatch(await resposta.text(), /privado|SELECT|INSERT/);
        }
    });
});

const migracao = fs.readFileSync(path.join(__dirname, '../migrations/006_registro_sono.sql'), 'utf8');

test('migração de sono preserva o legado, pode ser repetida e protege integridade', async (t) => {
    const banco = new PGlite();
    t.after(() => banco.close());
    await banco.exec("CREATE TABLE usuario (id_usuario SERIAL PRIMARY KEY); INSERT INTO usuario DEFAULT VALUES;" +
        "CREATE TABLE sono (id_sono SERIAL PRIMARY KEY, id_usuario INT NOT NULL REFERENCES usuario, hora_dormiu TIME NOT NULL," +
        "hora_acordou TIME NOT NULL, data_registro DATE NOT NULL DEFAULT CURRENT_DATE);" +
        "INSERT INTO sono VALUES (42, 1, '22:15', '06:45', '2025-10-01');");
    await banco.exec(migracao);
    await banco.exec(migracao);
    const [registro] = (await banco.query('SELECT *, data_registro::text AS dia FROM sono')).rows;
    assert.equal(registro.id_sono, 42);
    assert.equal(registro.dia, '2025-10-01');
    assert.equal(registro.hora_dormiu, '22:15:00');
    assert.equal(registro.fuso_horario, 'UTC');
    for (const [query, codigo] of [
        ["UPDATE usuario SET meta_sono_horas_min = 9", '23514'],
        ["UPDATE sono SET hora_dormiu = hora_acordou", '23514'],
        ["UPDATE sono SET hora_dormiu = '24:00'", '23514'],
        ["UPDATE sono SET fuso_horario = ' '", '23514'],
        ["UPDATE sono SET data_registro = 'infinity'", '23514'],
        ["UPDATE sono SET id_usuario = 99", '23503'],
        ["INSERT INTO sono (id_usuario, hora_dormiu, hora_acordou, data_registro) VALUES (1, '23:00', '06:00', '2025-10-01')", '23505'],
    ]) await assert.rejects(banco.exec(query), (erro) => erro.code === codigo);
});

test('migração aborta duplicatas legadas sem apagar nem escolher um histórico arbitrário', async (t) => {
    const banco = new PGlite();
    t.after(() => banco.close());
    await banco.exec("CREATE TABLE usuario (id_usuario SERIAL PRIMARY KEY); INSERT INTO usuario DEFAULT VALUES;" +
        "CREATE TABLE sono (id_sono SERIAL PRIMARY KEY, id_usuario INT NOT NULL REFERENCES usuario, hora_dormiu TIME NOT NULL," +
        "hora_acordou TIME NOT NULL, data_registro DATE NOT NULL);" +
        "INSERT INTO sono (id_usuario, hora_dormiu, hora_acordou, data_registro) VALUES (1, '22:00', '06:00', '2025-10-01'), (1, '23:00', '07:00', '2025-10-01');");
    await assert.rejects(banco.exec(migracao), (erro) => erro.code === '23505');
    await banco.exec('ROLLBACK');
    assert.equal((await banco.query('SELECT count(*)::int AS n FROM sono')).rows[0].n, 2);
    assert.equal((await banco.query("SELECT count(*)::int AS n FROM information_schema.columns WHERE table_name = 'usuario' AND column_name = 'meta_sono_horas_min'")).rows[0].n, 0);
});
