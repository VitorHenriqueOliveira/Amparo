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

async function guardarLista(tipo, idUsuario, dados) {
  await AsyncStorage.setItem(chave(tipo, idUsuario), JSON.stringify(dados));
}

const gerarId = () => Date.now() + '-' + Math.random().toString(36).slice(2, 8);

export function listarEmocoes(idUsuario) {
  return lerLista('emocoes', idUsuario);
}

export async function adicionarEmocao(idUsuario, emotionKey, emotionTitle) {
  const registros = await listarEmocoes(idUsuario);
  const registro = { id: gerarId(), emotionKey, emotionTitle, date: new Date().toISOString() };
  await guardarLista('emocoes', idUsuario, [...registros, registro]);
  return registro;
}

export function listarSono(idUsuario) {
  return lerLista('sono', idUsuario);
}
