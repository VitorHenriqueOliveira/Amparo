const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

async function carregar(arquivo, api) {
    const contexto = vm.createContext({ Date, Intl });
    const modulo = new vm.SourceTextModule(fs.readFileSync(path.join(__dirname, '../src', arquivo), 'utf8'), { context: contexto });
    await modulo.link((specifier) => {
        assert.equal(specifier, './api');
        return new vm.SyntheticModule(['default'], function () { this.setExport('default', api); }, { context: contexto });
    });
    await modulo.evaluate();
    return modulo.namespace;
}

test('períodos preservam dias locais, anos, fevereiro bissexto e meses com tamanhos diferentes', async () => {
    const util = await carregar('utils/evolucao.js');
    const comparar = (filtro, data, inicio, fim) => {
        const periodo = util.obterPeriodo(filtro, data);
        assert.equal(periodo.inicio, inicio);
        assert.equal(periodo.fim, fim);
    };
    comparar('Dia', new Date(2026, 9, 15, 23, 59), '2026-10-15', '2026-10-15');
    comparar('Semana', new Date(2026, 0, 3), '2025-12-29', '2026-01-04');
    comparar('Mês', new Date(2024, 1, 20), '2024-02-01', '2024-02-29');
    const anterior = util.moverPeriodo('Mês', new Date(2026, 2, 31), -1);
    comparar('Mês', anterior, '2026-02-01', '2026-02-28');
    comparar('Mês', util.moverPeriodo('Mês', new Date(2026, 11, 31), 1), '2027-01-01', '2027-01-31');
    comparar('Semana', util.moverPeriodo('Semana', new Date(2026, 0, 3), -1), '2025-12-22', '2025-12-28');
    comparar('Dia', util.moverPeriodo('Dia', new Date(2026, 0, 1), -1), '2025-12-31', '2025-12-31');
    assert.equal(util.nomeDia('2026-10-15'), 'Qui');
});

test('filtro diário mostra Hoje somente na data atual e não repete a data no intervalo', async () => {
    const util = await carregar('utils/evolucao.js');
    const hoje = new Date(2026, 9, 15, 23, 59);
    const atual = util.obterPeriodo('Dia', hoje, hoje);
    const anterior = util.obterPeriodo('Dia', new Date(2026, 9, 14), hoje);

    assert.equal(atual.titulo, 'Hoje');
    assert.equal(atual.intervalo, 'Dia 15/10/2026');
    assert.equal(anterior.titulo, '14/10/2026');
    assert.equal(anterior.intervalo, 'Dia 14/10/2026');
    assert.equal(util.obterPeriodo('Semana', hoje, hoje).intervalo, '12/10/2026 a 18/10/2026');
    assert.equal(util.obterPeriodo('Mês', hoje, hoje).titulo, 'Seu mês de Outubro de 2026');
});

test('semana começa na segunda e termina no domingo para qualquer dia de referência', async () => {
    const util = await carregar('utils/evolucao.js');

    for (let dia = 12; dia <= 18; dia++) {
        const periodo = util.obterPeriodo('Semana', new Date(2026, 9, dia, 23, 59));

        assert.equal(periodo.inicio, '2026-10-12');
        assert.equal(periodo.fim, '2026-10-18');
        assert.equal(periodo.intervalo, '12/10/2026 a 18/10/2026');
    }

    const bissexto = util.obterPeriodo('Semana', new Date(2024, 2, 1));
    assert.equal(bissexto.inicio, '2024-02-26');
    assert.equal(bissexto.fim, '2024-03-03');

    const proxima = util.obterPeriodo('Semana', util.moverPeriodo('Semana', new Date(2026, 9, 18), 1));
    assert.equal(proxima.inicio, '2026-10-19');
    assert.equal(proxima.fim, '2026-10-25');
});

test('serviço envia somente intervalo e fuso e utiliza os cálculos recebidos da API', async () => {
    const dados = { periodo: { inicio: '2026-10-01', fim: '2026-10-31' },
        total: 3, contagens: { feliz: 1, triste: 1, neutro: 1, raiva: 0 },
        percentuais: { feliz: 34, triste: 33, neutro: 33, raiva: 0 }, conselho: { texto: 'Continue se observando' },
        totalNotas: 0, diario: { total: 0, diasComRegistros: 0 }, dias: [] };
    const api = { async get(rota, config) {
        assert.equal(rota, '/emocoes/evolucao');
        assert.deepEqual(Object.keys(config.params), ['inicio', 'fim', 'fuso_horario']);
        assert.equal(config.params.inicio, '2026-10-01');
        assert.equal(config.params.fim, '2026-10-31');
        assert.equal(config.params.fuso_horario, Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
        return { data: dados };
    } };
    const servico = await carregar('services/evolucao.js', api);
    assert.equal(await servico.buscarEvolucao('2026-10-01', '2026-10-31'), dados);
    api.get = async () => { throw new Error('Sem conexão'); };
    await assert.rejects(servico.buscarEvolucao('2026-10-01', '2026-10-31'), /conexão/);
    for (const valor of [null, {}, { ...dados, periodo: { inicio: '2026-09-01', fim: '2026-09-30' } },
        { ...dados, diario: null }, { ...dados, totalNotas: -1 }, { ...dados, diario: { total: 1, diasComRegistros: 1 } }]) {
        api.get = async () => ({ data: valor });
        await assert.rejects(servico.buscarEvolucao('2026-10-01', '2026-10-31'), /confirmar/);
    }
});

test('diário por período usa o mesmo fuso e preserva textos completos e paginação da API', async () => {
    const nota = { id_diario: 42, descricao: 'Meu registro\nTexto completo.', data_registro: '2026-10-15T02:59:59.999Z' };
    const resposta = { periodo: { inicio: '2026-10-14', fim: '2026-10-14' }, pagina: 2,
        tamanhoPagina: 20, total: 21, totalPaginas: 2, notas: [nota] };
    const api = { async get(rota, config) {
        assert.equal(rota, '/diario/periodo');
        assert.equal(config.params.pagina, 2);
        assert.equal(config.params.inicio, '2026-10-14');
        assert.equal(config.params.fim, '2026-10-14');
        assert.equal(config.params.fuso_horario, Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
        return { data: resposta };
    } };
    const diario = await carregar('services/diario.js', api);
    const dados = await diario.listarDiarioPeriodo('2026-10-14', '2026-10-14', 2);
    assert.equal(dados.notas[0].text, nota.descricao);
    assert.equal(dados.notas[0].createdAt, nota.data_registro);
    for (const invalido of [{ ...resposta, pagina: 1 }, { ...resposta, total: -1 },
        { ...resposta, totalPaginas: 1 }, { ...resposta, notas: [] },
        { ...resposta, notas: [{ ...nota, descricao: null }] }]) {
        api.get = async () => ({ data: invalido });
        await assert.rejects(diario.listarDiarioPeriodo('2026-10-14', '2026-10-14', 2), /confirmar/);
    }
    api.get = async () => { throw new Error('Sem rede'); };
    await assert.rejects(diario.listarDiarioPeriodo('2026-10-14', '2026-10-14', 2), /rede/);
});
