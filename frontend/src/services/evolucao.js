import api from './api';

export async function buscarEvolucao(inicio, fim) {
    const { data } = await api.get('/emocoes/evolucao', {
        params: { inicio, fim, fuso_horario: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC' },
    });
    if (!data || data.periodo?.inicio !== inicio || data.periodo?.fim !== fim
        || !Number.isInteger(data.total) || !data.contagens || !data.percentuais
        || !data.conselho?.texto || !Array.isArray(data.dias)
        || !Number.isInteger(data.totalNotas) || data.totalNotas < 0 || data.diario?.total !== data.totalNotas
        || !Number.isInteger(data.diario.diasComRegistros) || data.diario.diasComRegistros < 0
        || data.diario.diasComRegistros > data.dias.length
        || data.dias.some((dia) => !Number.isInteger(dia.quantidadeNotas) || dia.quantidadeNotas < 0)
        || data.dias.reduce((soma, dia) => soma + dia.quantidadeNotas, 0) !== data.totalNotas
        || data.dias.filter((dia) => dia.quantidadeNotas > 0).length !== data.diario.diasComRegistros) {
        throw new Error('Não foi possível confirmar os dados deste período.');
    }
    return data;
}
