import api from './api';
import { listarSono as listarSonoLocal } from '../storage/registros';
import { calcularDuracao, metaValida } from '../utils/sono';

function diaValido(valor) {
    if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
    const data = new Date(valor + 'T00:00:00Z');
    return Number.isFinite(data.getTime()) && data.toISOString().slice(0, 10) === valor;
}

function fusoAtual() {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

function adaptarRegistro(item) {
    const totalMinutes = calcularDuracao(item?.hora_dormiu, item?.hora_acordou);
    if (!item?.id_sono || !diaValido(item.data_registro) || totalMinutes === null) {
        throw new Error('O servidor retornou um registro de sono inválido.');
    }
    return {
        id: item.id_sono,
        date: item.data_registro,
        sleepTime: item.hora_dormiu,
        wakeTime: item.hora_acordou,
        totalMinutes,
    };
}

function adaptarMeta(item) {
    const min = item?.meta_sono_horas_min;
    const max = item?.meta_sono_horas_max;
    if (!metaValida(min, max)) throw new Error('O servidor retornou uma meta de sono inválida.');
    return { min, max };
}

export async function buscarSono() {
    const { data } = await api.get('/sono', { params: { fuso_horario: fusoAtual() } });
    const atualizarEm = Date.parse(data?.proxima_atualizacao_em) - Date.parse(data?.agora);
    if (!diaValido(data?.hoje) || !Number.isFinite(atualizarEm) || atualizarEm <= 0 || atualizarEm > 27 * 3600000) {
        throw new Error('Não foi possível confirmar a data do registro.');
    }
    const registro = data.registro === null ? null : adaptarRegistro(data.registro);
    if (registro && registro.date !== data.hoje) throw new Error('O registro recebido pertence a outro dia.');
    return { hoje: data.hoje, meta: adaptarMeta(data), registro, atualizarEm };
}

export async function registrarSonoHoje(inicio, fim, diaReferencia) {
    if (calcularDuracao(inicio, fim) === null || !diaValido(diaReferencia)) {
        throw new Error('Selecione dois horários diferentes e confira a data.');
    }
    const { data } = await api.post('/sono', {
        hora_dormiu: inicio,
        hora_acordou: fim,
        fuso_horario: fusoAtual(),
        dia_referencia: diaReferencia,
    });
    const registro = adaptarRegistro(data);
    if (registro.date !== diaReferencia) throw new Error('O servidor retornou uma data diferente do registro.');
    return registro;
}

export async function atualizarMetaSono(min, max) {
    if (!metaValida(min, max)) throw new Error('Confira a faixa de horas da sua meta.');
    const { data } = await api.put('/sono/meta', { meta_sono_horas_min: min, meta_sono_horas_max: max });
    return adaptarMeta(data);
}

export async function listarSono(idUsuario) {
    if (!Number.isInteger(idUsuario) || idUsuario <= 0) throw new Error('Usuário inválido.');
    const [{ data }, locais] = await Promise.all([api.get('/sono/historico'), listarSonoLocal(idUsuario)]);
    if (!Array.isArray(data)) throw new Error('Histórico de sono inválido.');
    const porDia = new Map();
    // O histórico antigo continua no aparelho; o registro da API prevalece no mesmo dia.
    for (const item of locais) {
        if (diaValido(item?.date) && calcularDuracao(item.sleepTime, item.wakeTime) !== null) {
            porDia.set(item.date, { ...item, totalMinutes: calcularDuracao(item.sleepTime, item.wakeTime) });
        }
    }
    for (const item of data.map(adaptarRegistro)) porDia.set(item.date, item);
    return [...porDia.values()].sort((a, b) => b.date.localeCompare(a.date));
}
