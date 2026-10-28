const test = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { criarAmbienteSono } = require('./helpers/servidor-sono.cjs');

let api;
let criarProcessadorNotificacoes;
const agora = new Date('2026-10-23T12:00:00Z');
const depois = (minutos) => new Date(agora.getTime() + minutos * 60000);
const expoToken = 'ExpoPushToken[dispositivo-de-teste-12345]';

test.before(async () => {
    api = await criarAmbienteSono();
    ({ criarProcessadorNotificacoes } = await import('../src/services/notificacoes.js'));
});
test.after(async () => api?.encerrar());
test.beforeEach(async () => {
    await api.banco.exec('DELETE FROM notificacao_envio; DELETE FROM notificacao_lembrete; DELETE FROM notificacao_dispositivo; UPDATE usuario SET st_notificacao = TRUE;');
});

async function preparar({ id = 7, instalacao = randomUUID(), token = expoToken,
    horario = '09:00', fuso = 'America/Sao_Paulo', permissao = true } = {}) {
    assert.equal((await api.request('/notificacoes/dispositivos', 'PUT', {
        id_instalacao: instalacao, expo_token: token, permissao,
    }, id)).status, 200);
    assert.equal((await api.request('/notificacoes/lembretes/diario', 'PUT', {
        horario, fuso_horario: fuso, st_ativo: true,
    }, id)).status, 200);

    return instalacao;
}

function processador(enviar, recibos = async () => ({})) {
    return criarProcessadorNotificacoes({ sql: api.sql, cliente: { enviar, recibos } });
}

test('dispositivos e lembretes exigem autenticação, dados válidos e proprietário definido pelo JWT', async () => {
    const dispositivo = { id_instalacao: randomUUID(), expo_token: expoToken, permissao: true };
    const lembrete = { horario: '09:00', fuso_horario: 'America/Sao_Paulo', st_ativo: true };
    const antes = api.estado.consultas.length;

    for (const dados of [null, [], {}, { ...dispositivo, id_instalacao: 'forjado' },
        { ...dispositivo, expo_token: 'token-invalido' }, { ...dispositivo, permissao: 'true' },
        { ...dispositivo, id_usuario: 8 }]) {
        assert.equal((await api.request('/notificacoes/dispositivos', 'PUT', dados)).status, 400);
    }

    for (const dados of [null, [], {}, { ...lembrete, horario: '24:00' }, { ...lembrete, horario: '9:00' },
        { ...lembrete, st_ativo: 'true' }, { ...lembrete, id_usuario: 8 }]) {
        assert.equal((await api.request('/notificacoes/lembretes/diario', 'PUT', dados)).status, 400);
    }

    assert.equal(api.estado.consultas.length, antes);
    assert.equal((await api.request('/notificacoes/lembretes/diario', 'PUT', { ...lembrete, fuso_horario: 'Forjado/Fuso' })).status, 400);
    assert.equal((await api.request('/notificacoes/dispositivos', 'PUT', dispositivo, null)).status, 401);
    assert.equal((await api.request('/notificacoes/dispositivos', 'PUT', dispositivo, 99)).status, 401);
    assert.equal((await api.request('/notificacoes/lembretes', 'GET', undefined, null)).status, 401);
    assert.equal((await api.request('/notificacoes/lembretes', 'GET', undefined, 99)).status, 401);

    await preparar({ instalacao: dispositivo.id_instalacao });
    const proprios = await (await api.request('/notificacoes/lembretes?id_usuario=8')).json();
    const outros = await (await api.request('/notificacoes/lembretes', 'GET', undefined, 8)).json();

    assert.deepEqual(proprios, { st_notificacao: true, lembretes: [{ tipo: 'diario', ...lembrete }] });
    assert.deepEqual(outros.lembretes, []);
    const conflito = await api.request('/notificacoes/dispositivos', 'PUT', { ...dispositivo, id_instalacao: randomUUID() }, 8);

    assert.equal(conflito.status, 409);
    assert.doesNotMatch(await conflito.text(), /ExpoPushToken|23505|SELECT|INSERT/);
});

test('processadores concorrentes reservam e enviam uma única vez por dispositivo e dia local', async () => {
    await preparar();
    const enviados = [];
    const executor = processador(async (token) => { enviados.push(token); return { status: 'ok', id: randomUUID() }; });

    await Promise.all([executor.processar(agora), executor.processar(agora)]);
    await executor.processar(depois(1));

    assert.deepEqual(enviados, [expoToken]);
    const envios = (await api.banco.query("SELECT estado, tentativas, dia_local::text AS dia FROM notificacao_envio")).rows;

    assert.deepEqual(envios, [{ estado: 'aceito', tentativas: 1, dia: '2026-10-23' }]);
    await executor.processar(new Date('2026-10-24T12:00:00Z'));
    assert.equal(enviados.length, 2);
});

test('preferência, permissão, suspensão e logout impedem o envio sem remover os horários', async () => {
    const instalacao = await preparar({ permissao: false });
    let enviados = 0;
    const executor = processador(async () => { enviados++; return { status: 'ok', id: randomUUID() }; });

    await executor.processar(agora);
    assert.equal(enviados, 0);
    await preparar({ instalacao });
    await api.request('/perfil/notificacoes', 'PUT', { st_notificacao: false });
    await executor.processar(agora);
    assert.equal(enviados, 0);
    await api.request('/perfil/notificacoes', 'PUT', { st_notificacao: true });
    await api.request('/notificacoes/lembretes/diario', 'PUT', { horario: '09:00', fuso_horario: 'America/Sao_Paulo', st_ativo: false });
    await executor.processar(agora);
    assert.equal(enviados, 0);
    await preparar({ instalacao });
    assert.equal((await api.request('/notificacoes/dispositivos/' + instalacao, 'DELETE', undefined, 8)).status, 204);
    assert.equal((await api.banco.query('SELECT st_ativo FROM notificacao_dispositivo')).rows[0].st_ativo, true);
    assert.equal((await api.request('/notificacoes/dispositivos/' + instalacao, 'DELETE')).status, 204);
    await executor.processar(agora);
    assert.equal(enviados, 0);
    assert.equal((await api.banco.query('SELECT count(*)::int AS total FROM notificacao_lembrete')).rows[0].total, 1);
});

test('desativar a preferência cancela tentativas pendentes da própria conta', async () => {
    await preparar();
    const executor = processador(async () => { throw Object.assign(new Error('Limite simulado'), { repetivel: true }); });

    await executor.processar(agora);
    assert.equal((await api.banco.query('SELECT estado FROM notificacao_envio')).rows[0].estado, 'pendente');
    assert.equal((await api.request('/perfil/notificacoes', 'PUT', { st_notificacao: false })).status, 200);
    assert.equal((await api.banco.query('SELECT estado FROM notificacao_envio')).rows[0].estado, 'cancelado');
    await api.request('/perfil/notificacoes', 'PUT', { st_notificacao: true });
    let enviados = 0;

    await processador(async () => { enviados++; return { status: 'ok', id: randomUUID() }; }).processar(depois(3));
    assert.equal(enviados, 0);
});

test('troca de conta e rotação do token invalidam reservas anteriores da instalação', async () => {
    const instalacao = await preparar();
    await processador(async () => { throw Object.assign(new Error('Limite simulado'), { repetivel: true }); }).processar(agora);
    const novoToken = 'ExpoPushToken[outra-conta-dispositivo-12345]';

    await preparar({ id: 8, instalacao, token: novoToken });
    const enviados = [];

    await processador(async (token) => { enviados.push(token); return { status: 'ok', id: randomUUID() }; }).processar(depois(3));
    assert.deepEqual(enviados, [novoToken]);
    assert.deepEqual((await api.banco.query('SELECT estado FROM notificacao_envio ORDER BY id_envio')).rows.map((envio) => envio.estado), ['cancelado', 'aceito']);
    assert.equal((await api.banco.query('SELECT id_usuario FROM notificacao_dispositivo')).rows[0].id_usuario, 8);
});

test('horários respeitam o fuso, a virada do dia, o horário de verão e a janela de entrega', async () => {
    await preparar({ horario: '21:00', fuso: 'America/Sao_Paulo' });
    let enviados = 0;
    const executor = processador(async () => { enviados++; return { status: 'ok', id: randomUUID() }; });

    await executor.processar(new Date('2026-10-24T00:00:00Z'));
    assert.equal((await api.banco.query('SELECT dia_local::text AS dia FROM notificacao_envio')).rows[0].dia, '2026-10-23');
    assert.equal(enviados, 1);
    await api.banco.exec('DELETE FROM notificacao_envio; DELETE FROM notificacao_lembrete; DELETE FROM notificacao_dispositivo;');
    await preparar({ horario: '01:30', fuso: 'America/New_York' });
    await executor.processar(new Date('2026-11-01T05:30:00Z'));
    await executor.processar(new Date('2026-11-01T06:30:00Z'));
    assert.equal(enviados, 2);
    await executor.processar(new Date('2026-11-02T06:46:00Z'));
    assert.equal(enviados, 2);
});

test('confirmações de token inválido desativam somente o vínculo que foi utilizado no envio', async () => {
    const instalacao = await preparar();
    await processador(async () => ({ status: 'error', details: { error: 'DeviceNotRegistered' } })).processar(agora);
    assert.equal((await api.banco.query('SELECT st_ativo FROM notificacao_dispositivo')).rows[0].st_ativo, false);
    await preparar({ instalacao });
    const executor = processador(async () => ({ status: 'ok', id: 'ticket-aceito' }), async () => ({
        'ticket-aceito': { status: 'error', details: { error: 'DeviceNotRegistered' } },
    }));

    await executor.processar(new Date('2026-10-24T12:00:00Z'));
    await preparar({ instalacao, token: 'ExpoPushToken[token-renovado-dispositivo-12345]' });
    await executor.processar(new Date('2026-10-24T12:16:00Z'));
    const [dispositivo] = (await api.banco.query('SELECT st_ativo FROM notificacao_dispositivo')).rows;

    assert.equal(dispositivo.st_ativo, true);
    assert.equal((await api.banco.query("SELECT estado FROM notificacao_envio WHERE ticket = 'ticket-aceito'")).rows[0].estado, 'falha');
});

test('recibos confirmam a aceitação pelo provedor sem enviar novamente', async () => {
    await preparar();
    let enviados = 0;
    const executor = processador(async () => { enviados++; return { status: 'ok', id: 'ticket-aceito' }; }, async (ids) => {
        assert.deepEqual(ids, ['ticket-aceito']);
        return { 'ticket-aceito': { status: 'ok' } };
    });

    await executor.processar(agora);
    assert.equal((await executor.processar(depois(16))).recibos, 1);
    assert.equal((await api.banco.query('SELECT estado FROM notificacao_envio')).rows[0].estado, 'entregue');
    assert.equal(enviados, 1);
});

test('falhas confirmadas respeitam espera e três tentativas; resultados incertos não são repetidos', async () => {
    await preparar();
    let tentativas = 0;
    const executor = processador(async () => { tentativas++; throw Object.assign(new Error('Limite simulado'), { repetivel: true }); });

    await executor.processar(agora);
    await executor.processar(depois(1));
    assert.equal(tentativas, 1);
    await executor.processar(depois(2));
    await executor.processar(depois(6));
    await executor.processar(depois(10));
    assert.equal(tentativas, 3);
    assert.equal((await api.banco.query('SELECT estado FROM notificacao_envio')).rows[0].estado, 'falha');

    const incerto = processador(async () => { tentativas++; throw new Error('Timeout simulado após o envio'); });

    await incerto.processar(new Date('2026-10-24T12:00:00Z'));
    await incerto.processar(new Date('2026-10-24T12:05:00Z'));
    assert.equal(tentativas, 4);
    assert.equal((await api.banco.query('SELECT estado FROM notificacao_envio ORDER BY id_envio DESC LIMIT 1')).rows[0].estado, 'incerto');
});

test('cliente Expo usa HTTPS, conteúdo genérico, credencial só no servidor e consulta de recibos', async () => {
    const { criarClienteExpo } = await import('../src/services/expo-push.js');
    const chamadas = [];
    const cliente = criarClienteExpo({ accessToken: 'credencial-ficticia-de-teste', fetchImpl: async (url, opcoes) => {
        chamadas.push({ url, opcoes });
        return { ok: true, json: async () => ({ data: chamadas.length === 1 ? { status: 'ok', id: 'ticket' } : { ticket: { status: 'ok' } } }) };
    } });

    assert.deepEqual(await cliente.enviar(expoToken), { status: 'ok', id: 'ticket' });
    assert.deepEqual(await cliente.recibos(['ticket']), { ticket: { status: 'ok' } });
    assert.equal(chamadas[0].url, 'https://exp.host/--/api/v2/push/send');
    assert.deepEqual(JSON.parse(chamadas[0].opcoes.body), {
        to: expoToken, title: 'Amparo', body: 'Reserve um momento para cuidar de você.', sound: 'default', ttl: 900,
    });
    assert.equal(chamadas[0].opcoes.headers.Authorization, 'Bearer credencial-ficticia-de-teste');
    assert.deepEqual(JSON.parse(chamadas[1].opcoes.body), { ids: ['ticket'] });
    assert.equal(chamadas[1].url, 'https://exp.host/--/api/v2/push/getReceipts');

    for (const status of [429, 500]) {
        const falha = criarClienteExpo({ fetchImpl: async () => ({ ok: false, status }) });

        await assert.rejects(falha.enviar(expoToken), (error) => error.repetivel === (status === 429));
    }

    for (const data of [{ status: 'ok', id: '' }, { status: 'ok' }, { status: 'desconhecido' }]) {
        const invalido = criarClienteExpo({ fetchImpl: async () => ({ ok: true, json: async () => ({ data }) }) });

        await assert.rejects(invalido.enviar(expoToken), /Confirmação de envio inválida/);
    }
});

test('falhas do banco nas rotas de notificações não confirmam alterações nem expõem dados internos', async () => {
    const instalacao = randomUUID();
    api.estado.falhar = true;

    try {
        for (const [rota, metodo, body] of [
            ['/notificacoes/lembretes', 'GET'],
            ['/notificacoes/dispositivos', 'PUT', { id_instalacao: instalacao, expo_token: expoToken, permissao: true }],
            ['/notificacoes/lembretes/diario', 'PUT', { horario: '09:00', fuso_horario: 'America/Sao_Paulo', st_ativo: true }],
            ['/notificacoes/dispositivos/' + instalacao, 'DELETE'],
        ]) {
            const resposta = await api.request(rota, metodo, body);

            assert.equal(resposta.status, 500);
            assert.doesNotMatch(await resposta.text(), /privado|ExpoPushToken|SELECT|UPDATE|INSERT|stack/);
        }
    } finally {
        api.estado.falhar = false;
    }
});
