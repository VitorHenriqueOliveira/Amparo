const test = require('node:test');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { criarAmbienteSono } = require('./helpers/servidor-sono.cjs');
const chave = (valor) => createHash('sha256').update(valor).digest('hex');
const emocao = (id = 'emocao') => ({ tipo: 'emocoes', chave: chave(id),
    dados: { id_emocao: 'Triste', registrado_em: '2025-09-03T02:30:00.123Z' } });
const sono = (id = 'sono') => ({ tipo: 'sono', chave: chave(id),
    dados: { dia: '2025-09-02', hora_dormiu: '22:30', hora_acordou: '06:30', fuso_horario: 'America/Sao_Paulo' } });
const nota = (id = 'nota') => ({ tipo: 'diario', chave: chave(id),
    dados: { descricao: 'Texto antigo completo\nSegunda linha', registrado_em: '2025-09-03T02:30:00.123Z' } });

async function preparar(t) {
    const ambiente = await criarAmbienteSono();
    t.after(() => ambiente.encerrar());
    return ambiente;
}

test('importa emoções, sono e diário nas datas originais e aparecem na evolução local', async (t) => {
    const a = await preparar(t);
    for (const body of [emocao(), sono(), nota()]) {
        const res = await a.request('/historicos/importar', 'POST', body);
        assert.equal(res.status, 200);
        assert.equal((await res.json()).situacao, 'importado');
    }
    const res = await a.request('/emocoes/evolucao?inicio=2025-09-02&fim=2025-09-02&fuso_horario=America%2FSao_Paulo');
    assert.equal(res.status, 200);
    const dados = await res.json();
    assert.equal(dados.total, 1);
    assert.equal(dados.totalNotas, 1);
    assert.equal(dados.mediaSono, 480);
    const [registro] = (await a.banco.query('SELECT data_registro FROM diario')).rows;
    assert.equal(registro.data_registro.toISOString(), nota().dados.registrado_em);
    assert.equal((await a.banco.query('SELECT descricao FROM diario')).rows[0].descricao, nota().dados.descricao);
});

test('reenvios concorrentes não duplicam registros nem recriam notas editadas ou excluídas', async (t) => {
    const a = await preparar(t);
    for (const body of [emocao(), sono(), nota()]) {
        const respostas = await Promise.all(Array.from({ length: 4 }, () => a.request('/historicos/importar', 'POST', body)));
        const ids = await Promise.all(respostas.map(async (r) => (await r.json()).registro));
        assert.equal(new Set(ids).size, 1);
    }
    for (const tabela of ['registro_emocional', 'sono', 'diario']) {
        assert.equal((await a.banco.query('SELECT count(*)::int AS total FROM ' + tabela)).rows[0].total, 1);
    }
    await a.banco.exec("UPDATE diario SET descricao = 'Texto editado depois da importação'");
    await a.request('/historicos/importar', 'POST', nota());
    assert.equal((await a.banco.query('SELECT descricao FROM diario')).rows[0].descricao, 'Texto editado depois da importação');
    await a.banco.exec('DELETE FROM diario');
    await a.request('/historicos/importar', 'POST', nota());
    assert.equal((await a.banco.query('SELECT count(*)::int AS total FROM diario')).rows[0].total, 0);
    const alterada = nota();
    alterada.dados.descricao = 'Outro texto';
    assert.equal((await (await a.request('/historicos/importar', 'POST', alterada)).json()).situacao, 'conflito');
    // Confirmações distintas da mesma emoção continuam distintas.
    await a.request('/historicos/importar', 'POST', emocao('segunda-emocao'));
    assert.equal((await a.banco.query('SELECT count(*)::int AS total FROM registro_emocional')).rows[0].total, 2);
});

test('preserva o sono já salvo e informa coincidências ou conflitos sem atualizar seus horários', async (t) => {
    const a = await preparar(t);
    await a.request('/historicos/importar', 'POST', sono());
    assert.equal((await (await a.request('/historicos/importar', 'POST', sono('mesmo-dia'))).json()).situacao, 'existente');
    const diferente = sono('horario-diferente');
    diferente.dados.hora_dormiu = '23:45';
    const res = await a.request('/historicos/importar', 'POST', diferente);
    assert.equal((await res.json()).situacao, 'conflito');
    assert.equal((await a.banco.query('SELECT hora_dormiu::text AS hora FROM sono')).rows[0].hora, '22:30:00');
});

test('importação isola as contas e exige autenticação e dados válidos', async (t) => {
    const a = await preparar(t);
    assert.equal((await a.request('/historicos/importar', 'POST', nota(), null)).status, 401);
    for (const id of [7, 8]) assert.equal((await a.request('/historicos/importar', 'POST', nota(), id)).status, 200);
    const notas = (await a.banco.query('SELECT id_usuario FROM diario ORDER BY id_usuario')).rows;
    assert.deepEqual(notas.map((n) => n.id_usuario), [7, 8]);
    const invalidos = [null, [], {}, { ...nota(), id_usuario: 8 }, { ...nota(), chave: 'invalida' },
        { ...nota(), tipo: 'usuario' }, { ...nota(), dados: { ...nota().dados, registrado_em: '2025-02-30T00:00:00.000Z' } },
        { ...nota(), dados: { descricao: ' ', registrado_em: nota().dados.registrado_em } },
        { ...emocao(), dados: { id_emocao: 'Inexistente', registrado_em: emocao().dados.registrado_em } },
        { ...sono(), dados: { ...sono().dados, dia: '9999-01-01' } },
        { ...sono(), dados: { ...sono().dados, hora_dormiu: '24:00' } },
        { ...sono(), dados: { ...sono().dados, fuso_horario: 'Inexistente' } },
        { ...nota(), dados: { ...nota().dados, id_usuario: 8 } }];
    for (const body of invalidos) assert.equal((await a.request('/historicos/importar', 'POST', body)).status, 400);
    assert.equal((await a.request('/historicos/importar', 'POST', nota(), 999)).status, 401);
});

test('notas sem horário conservam o dia no fuso informado e falhas não deixam recibos parciais', async (t) => {
    const a = await preparar(t);
    const antiga = { tipo: 'diario', chave: chave('sem-hora'),
        dados: { descricao: 'Somente o dia conhecido', dia: '2025-09-02', fuso_horario: 'America/Sao_Paulo' } };
    assert.equal((await a.request('/historicos/importar', 'POST', antiga)).status, 200);
    assert.equal((await a.banco.query('SELECT data_registro FROM diario')).rows[0].data_registro.toISOString(), '2025-09-02T15:00:00.000Z');
    a.estado.falhar = true;
    const resposta = await a.request('/historicos/importar', 'POST', emocao());
    assert.equal(resposta.status, 500);
    assert.ok(!(await resposta.text()).includes('privado'));
    a.estado.falhar = false;
    assert.equal((await a.banco.query("SELECT count(*)::int AS total FROM importacao_historico WHERE tipo = 'emocoes'")).rows[0].total, 0);
    assert.equal((await a.request('/historicos/importar', 'POST', emocao())).status, 200);
});
