import api from './api';
import { randomUUID } from 'expo-crypto';

const titulos = {
    feliz: 'Feliz',
    triste: 'Triste',
    neutro: 'Neutro',
    raiva: 'Raiva',
};

function adaptarRegistro(registro) {
    return {
        id: registro.id_registro_emocao,
        emotionKey: registro.id_emocao.toLowerCase(),
        emotionTitle: registro.id_emocao,
        // O timestamp com fuso vem do servidor; o gráfico usa o dia local.
        date: registro.registrado_em,
        createdAt: registro.registrado_em,
    };
}

export async function listarEmocoes() {
    const { data } = await api.get('/emocoes');

    return data.map(adaptarRegistro);
}

export function criarIdConfirmacao() {
    return randomUUID();
}

export async function adicionarEmocao(emotionKey, idCliente) {
    if (typeof emotionKey !== 'string' || !Object.hasOwn(titulos, emotionKey)) {
        throw new Error('Selecione uma emoção válida.');
    }

    if (typeof idCliente !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(idCliente)) {
        throw new Error('Identificador de confirmação inválido.');
    }

    const { data } = await api.post('/emocoes', { id_emocao: titulos[emotionKey], id_cliente: idCliente });

    return adaptarRegistro(data);
}
