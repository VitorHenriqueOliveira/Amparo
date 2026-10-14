import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';

const CHAVES = ['@Amparo:usuario', '@Amparo:token'];

function validarSessao(usuario, token) {
  return Number.isInteger(usuario?.id_usuario) && usuario.id_usuario > 0 &&
    typeof token === 'string' && token.trim().length > 0;
}

export async function restaurarSessao() {
  delete api.defaults.headers.common.Authorization;
  const [[, usuarioSalvo], [, token]] = await AsyncStorage.multiGet(CHAVES);
  if (!usuarioSalvo && !token) return null;
  let usuario;
  try { usuario = JSON.parse(usuarioSalvo); } catch { usuario = null; }
  if (!validarSessao(usuario, token)) {
    await AsyncStorage.multiRemove(CHAVES);
    return null;
  }
  api.defaults.headers.common.Authorization = 'Bearer ' + token;
  return usuario;
}

export async function iniciarSessao(usuario, token) {
  if (!validarSessao(usuario, token)) throw new Error('Resposta de login inválida.');
  await AsyncStorage.multiSet([
    [CHAVES[0], JSON.stringify(usuario)],
    [CHAVES[1], token],
  ]);
  api.defaults.headers.common.Authorization = 'Bearer ' + token;
}

export async function encerrarSessao() {
  await AsyncStorage.multiRemove(CHAVES);
  delete api.defaults.headers.common.Authorization;
}

export async function salvarUsuario(usuario) {
  await AsyncStorage.setItem(CHAVES[0], JSON.stringify(usuario));
}
