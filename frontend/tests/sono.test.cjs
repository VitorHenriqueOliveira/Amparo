const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

async function carregar(api = {}, locais = []) {
    const contexto = vm.createContext({ Date, Intl, console });
    const util = new vm.SourceTextModule(fs.readFileSync(path.join(__dirname, '../src/utils/sono.js'), 'utf8'), { context: contexto });
    await util.link(() => assert.fail('Utilitário de sono deve ser puro.'));
    await util.evaluate();
    const servico = new vm.SourceTextModule(fs.readFileSync(path.join(__dirname, '../src/services/sono.js'), 'utf8'), { context: contexto });
    await servico.link((specifier) => {
        if (specifier === '../utils/sono') return util;
        const namespace = specifier === './api' ? { default: api } : {
            listarSono: async (id) => {
                assert.equal(id, 7);
                return locais;
            },
        };
        return new vm.SyntheticModule(Object.keys(namespace), function () {
            for (const [chave, valor] of Object.entries(namespace)) this.setExport(chave, valor);
        }, { context: contexto });
    });
    await servico.evaluate();
    return { util: util.namespace, servico: servico.namespace };
}

const registro = { id_sono: 42, data_registro: '2026-10-14', hora_dormiu: '23:45', hora_acordou: '07:15' };
const hoje = {
    hoje: '2026-10-14', agora: '2026-10-14T23:00:00Z', proxima_atualizacao_em: '2026-10-15T03:00:00Z',
    meta_sono_horas_min: 7, meta_sono_horas_max: 8, registro: null,
};

test('duração aceita passagem da meia-noite, minutos e sono diurno sem confundir horários iguais com 24h', async () => {
    const { util } = await carregar();
    for (const [inicio, fim, esperado] of [['23:45', '07:15', 450], ['08:30', '10:00', 90],
        ['00:00', '00:01', 1], ['00:01', '00:00', 1439]]) {
        assert.equal(util.calcularDuracao(inicio, fim), esperado);
    }
    for (const [inicio, fim] of [['08:00', '08:00'], ['24:00', '08:00'], ['7:00', '08:00'],
        [null, '08:00'], [[], '08:00'], ['22:00', '']]) assert.equal(util.calcularDuracao(inicio, fim), null);
    assert.equal(util.formatarDuracao(450), '7h 30min');
    assert.equal(util.formatarDuracao(480), '8h');
    assert.equal(util.formatarDuracao(null), '—');
});

test('status e progresso respeitam a meta pessoal inclusive os limites exatos', async () => {
    const { util } = await carregar();
    assert.equal(util.avaliarMeta(null, 7, 8).progresso, 0);
    assert.equal(util.avaliarMeta(419, 7, 8).texto, 'Abaixo da sua meta');
    assert.equal(util.avaliarMeta(419, 7, 8).progresso, 99);
    assert.equal(util.avaliarMeta(420, 7, 8).texto, 'Meta alcançada');
    assert.equal(util.avaliarMeta(420, 7, 8).progresso, 100);
    assert.equal(util.avaliarMeta(480, 7, 8).texto, 'Meta alcançada');
    assert.equal(util.avaliarMeta(481, 7, 8).texto, 'Acima da sua faixa');
    assert.equal(util.avaliarMeta(360, 6, 9).texto, 'Meta alcançada');
    assert.equal(util.metaValida(8, 7), false);
    assert.equal(util.metaValida(1, 24), true);
});

test('consulta carrega dia e meta do servidor sem inventar um registro e calcula espera pelo relógio remoto', async () => {
    const api = { async get(rota, config) {
        assert.equal(rota, '/sono');
        assert.equal(typeof config.params.fuso_horario, 'string');
        return { data: hoje };
    } };
    const { servico } = await carregar(api);
    const dados = await servico.buscarSono();
    assert.equal(dados.registro, null);
    assert.equal(dados.hoje, '2026-10-14');
    assert.equal(dados.atualizarEm, 4 * 3600000);
    assert.equal(dados.meta.min, 7);
    api.get = async () => ({ data: { ...hoje, registro } });
    assert.equal((await servico.buscarSono()).registro.totalMinutes, 450);
});

test('envio usa horas e referência do servidor; reenvio e edição não mandam proprietário ou duração', async () => {
    let enviado;
    const api = { async post(rota, body) {
        enviado = body;
        assert.equal(rota, '/sono');
        return { data: { ...registro, hora_dormiu: body.hora_dormiu } };
    } };
    const { servico } = await carregar(api);
    assert.equal((await servico.registrarSonoHoje('23:45', '07:15', '2026-10-14')).totalMinutes, 450);
    assert.deepEqual(Object.keys(enviado), ['hora_dormiu', 'hora_acordou', 'fuso_horario', 'dia_referencia']);
    assert.equal(enviado.dia_referencia, '2026-10-14');
    assert.equal((await servico.registrarSonoHoje('22:00', '07:15', '2026-10-14')).totalMinutes, 555);
    for (const [inicio, fim, dia] of [['07:15', '07:15', '2026-10-14'], ['25:00', '07:15', '2026-10-14'],
        ['22:00', '07:15', '2026-02-30']]) await assert.rejects(servico.registrarSonoHoje(inicio, fim, dia), /horários/);
});

test('meta é validada, enviada e lida da resposta persistida', async () => {
    let chamadas = 0;
    const { servico } = await carregar({ async put(rota, body) {
        chamadas++;
        assert.equal(rota, '/sono/meta');
        return { data: body };
    } });
    await assert.rejects(servico.atualizarMetaSono(9, 8), /faixa/);
    assert.equal(chamadas, 0);
    const meta = await servico.atualizarMetaSono(6, 9);
    assert.equal(meta.min, 6);
    assert.equal(meta.max, 9);
});

test('histórico combina legado da mesma conta com dados remotos, sem duplicar os dias', async () => {
    const locais = [
        { id: 'legado', date: '2026-10-13', sleepTime: '22:00', wakeTime: '06:00' },
        { id: 'substituido', date: '2026-10-14', sleepTime: '22:00', wakeTime: '06:00' },
        { date: 'invalido', sleepTime: '22:00', wakeTime: '06:00' },
    ];
    const { servico } = await carregar({ async get(rota) {
        assert.equal(rota, '/sono/historico');
        return { data: [registro] };
    } }, locais);
    const historico = await servico.listarSono(7);
    assert.equal(historico.length, 2);
    assert.equal(historico[0].id, 42);
    assert.equal(historico[0].totalMinutes, 450);
    assert.equal(historico[1].id, 'legado');
    assert.equal(historico[1].totalMinutes, 480);
});

test('falhas de rede, virada do dia e respostas inválidas não simulam persistência ou histórico vazio', async () => {
    const erro = { response: { status: 409, data: { codigo: 'DIA_ALTERADO' } } };
    const api = {
        async get() { throw new Error('Sem conexão'); },
        async post() { throw erro; },
        async put() { throw new Error('Sem conexão'); },
    };
    const { servico } = await carregar(api);
    await assert.rejects(servico.buscarSono(), /conexão/);
    await assert.rejects(servico.listarSono(7), /conexão/);
    await assert.rejects(servico.registrarSonoHoje('22:00', '07:00', '2026-10-14'), (falha) => falha === erro);
    await assert.rejects(servico.atualizarMetaSono(7, 8), /conexão/);
    for (const resposta of [
        { ...hoje, hoje: '2026-02-30' }, { ...hoje, meta_sono_horas_min: 9 },
        { ...hoje, proxima_atualizacao_em: 'invalido' }, { ...hoje, registro: {} },
        { ...hoje, registro: { ...registro, data_registro: '2026-10-13' } },
    ]) {
        api.get = async () => ({ data: resposta });
        await assert.rejects(servico.buscarSono());
    }
});
