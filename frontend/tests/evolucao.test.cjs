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
    comparar('Semana', new Date(2026, 0, 3), '2025-12-28', '2026-01-03');
    comparar('Mês', new Date(2024, 1, 20), '2024-02-01', '2024-02-29');
    const anterior = util.moverPeriodo('Mês', new Date(2026, 2, 31), -1);
    comparar('Mês', anterior, '2026-02-01', '2026-02-28');
    comparar('Mês', util.moverPeriodo('Mês', new Date(2026, 11, 31), 1), '2027-01-01', '2027-01-31');
    comparar('Semana', util.moverPeriodo('Semana', new Date(2026, 0, 3), -1), '2025-12-21', '2025-12-27');
    comparar('Dia', util.moverPeriodo('Dia', new Date(2026, 0, 1), -1), '2025-12-31', '2025-12-31');
    assert.equal(util.nomeDia('2026-10-15'), 'Qui');
});

test('serviço envia somente intervalo e fuso e utiliza os cálculos recebidos da API', async () => {
    const dados = { periodo: { inicio: '2026-10-01', fim: '2026-10-31' },
        total: 3, contagens: { feliz: 1, triste: 1, neutro: 1, raiva: 0 },
        percentuais: { feliz: 34, triste: 33, neutro: 33, raiva: 0 }, conselho: { texto: 'Continue se observando' }, dias: [] };
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
    for (const valor of [null, {}, { ...dados, periodo: { inicio: '2026-09-01', fim: '2026-09-30' } }]) {
        api.get = async () => ({ data: valor });
        await assert.rejects(servico.buscarEvolucao('2026-10-01', '2026-10-31'), /confirmar/);
    }
});
