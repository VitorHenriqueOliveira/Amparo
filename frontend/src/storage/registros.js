import AsyncStorage from '@react-native-async-storage/async-storage';

function chave(tipo, idUsuario) {
    if (!Number.isInteger(idUsuario) || idUsuario <= 0) throw new Error('Usuário inválido.');
    return '@amparo/' + tipo + ':' + idUsuario;
}

async function lerLista(tipo, idUsuario) {
    const conteudo = await AsyncStorage.getItem(chave(tipo, idUsuario));
    if (!conteudo) return [];
    const dados = JSON.parse(conteudo);
    return Array.isArray(dados) ? dados : [];
}

export function listarEmocoes(idUsuario) {
    return lerLista('emocoes', idUsuario);
}

export function listarSono(idUsuario) {
    return lerLista('sono', idUsuario);
}
