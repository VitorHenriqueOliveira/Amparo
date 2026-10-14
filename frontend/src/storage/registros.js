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

export async function registrarSonoHoje(idUsuario, sleepTime, wakeTime) {
  const formato = /^([01]\d|2[0-3]):[0-5]\d$/;
  if (!formato.test(sleepTime) || !formato.test(wakeTime)) throw new Error('Horário inválido.');
  const registros = await listarSono(idUsuario);
  const hoje = new Date();
  const data = [hoje.getFullYear(), String(hoje.getMonth() + 1).padStart(2, '0'), String(hoje.getDate()).padStart(2, '0')].join('-');
  const [h1, m1] = sleepTime.split(':').map(Number);
  const [h2, m2] = wakeTime.split(':').map(Number);
  let totalMinutes = h2 * 60 + m2 - (h1 * 60 + m1);
  if (totalMinutes <= 0) totalMinutes += 24 * 60;
  const existente = registros.find((item) => item.date === data);
  const registro = { id: existente?.id ?? gerarId(), date: data, sleepTime, wakeTime, totalMinutes };
  await guardarLista('sono', idUsuario, [...registros.filter((item) => item.date !== data), registro]);
  return registro;
}
