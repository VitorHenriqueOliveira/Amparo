import api from './api';

function adaptarNota(nota) {
    const valor = nota.data_registro;
    const data = new Date(/^\d{4}-\d{2}-\d{2}$/.test(valor) ? valor + 'T12:00:00' : valor);

    return {
        id: nota.id_diario,
        text: nota.descricao,
        date: data.toLocaleDateString('pt-BR'),
        createdAt: valor,
    };
}

export async function listarDiario(idUsuario) {
    const { data } = await api.get('/diario/' + idUsuario);

    return data.map(adaptarNota);
}

export async function listarDiarioPeriodo(inicio, fim, pagina = 1) {
    const { data } = await api.get('/diario/periodo', {
        params: { inicio, fim, pagina, fuso_horario: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC' },
    });

    if (!data || data.periodo?.inicio !== inicio || data.periodo?.fim !== fim || data.pagina !== pagina
        || !Number.isInteger(data.total) || data.total < 0 || data.tamanhoPagina !== 20
        || data.totalPaginas !== Math.ceil(data.total / data.tamanhoPagina)
        || !Array.isArray(data.notas)
        || data.notas.length !== Math.max(0, Math.min(data.tamanhoPagina, data.total - (pagina - 1) * data.tamanhoPagina))
        || data.notas.some((nota) => !Number.isSafeInteger(nota.id_diario) || nota.id_diario <= 0
            || typeof nota.descricao !== 'string' || !nota.descricao.trim() || !Number.isFinite(Date.parse(nota.data_registro)))) {
        throw new Error('Não foi possível confirmar os registros do diário. Tente novamente.');
    }

    return { ...data, notas: data.notas.map(adaptarNota) };
}

export async function criarNota(idUsuario, texto) {
    const { data } = await api.post('/diario', { id_usuario: idUsuario, descricao: texto });

    return adaptarNota(data);
}

export async function atualizarNota(id, texto) {
    const { data } = await api.put('/diario/' + id, { descricao: texto });

    return adaptarNota(data);
}

export async function excluirNota(id) {
    await api.delete('/diario/' + id);
}
