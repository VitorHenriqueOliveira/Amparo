import api from './api';

export async function buscarEvolucao(inicio, fim) {
    const { data } = await api.get('/emocoes/evolucao', {
        params: { inicio, fim, fuso_horario: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC' },
    });
    if (!data || data.periodo?.inicio !== inicio || data.periodo?.fim !== fim
        || !Number.isInteger(data.total) || !data.contagens || !data.percentuais
        || !data.conselho?.texto || !Array.isArray(data.dias)) {
        throw new Error('Não foi possível confirmar os dados deste período.');
    }
    return data;
}
