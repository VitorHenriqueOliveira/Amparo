import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { jwtDecode } from 'jwt-decode';
import api from './api';

const CHAVE_USUARIO = '@Amparo:usuario';
const CHAVE_TOKEN_ANTIGO = '@Amparo:token';
const CHAVE_TOKEN_SEGURO = 'amparo.token';

let tokenWeb = null;
let expiracao = null;
let temporizador = null;
let versaoSessao = 0;

const ouvintes = new Set();

function dadosToken(usuario, token) {
    try {
        const dados = jwtDecode(token);

        if (!Number.isSafeInteger(usuario?.id_usuario) || usuario.id_usuario <= 0 ||
            dados.id_usuario !== usuario.id_usuario || !Number.isInteger(dados.exp) ||
            dados.exp * 1000 <= Date.now()) {
            return null;
        }

        // A assinatura é validada pela API, não pelo leitor de JWT do cliente.
        return dados;
    } catch {
        return null;
    }
}

function cancelarTemporizador() {
    clearTimeout(temporizador);
    temporizador = null;
}

export function observarExpiracao(callback) {
    ouvintes.add(callback);

    return () => ouvintes.delete(callback);
}

export function verificarExpiracao() {
    if (expiracao === null || Date.now() < expiracao) {
        return;
    }

    cancelarTemporizador();
    expiracao = null;
    tokenWeb = null;
    delete api.defaults.headers.common.Authorization;

    for (const callback of ouvintes) {
        callback();
    }
}

function agendarExpiracao(dados) {
    cancelarTemporizador();
    expiracao = dados.exp * 1000;

    // Respeita o limite do temporizador e confere novamente ao voltar do segundo plano.
    const atraso = Math.min(Math.max(expiracao - Date.now(), 0), 2147483647);

    temporizador = setTimeout(() => {
        verificarExpiracao();

        if (expiracao !== null) {
            agendarExpiracao(dados);
        }
    }, atraso);
}

async function lerToken() {
    return Platform.OS === 'web' ? tokenWeb : SecureStore.getItemAsync(CHAVE_TOKEN_SEGURO);
}

export async function encerrarSessao() {
    versaoSessao++;
    cancelarTemporizador();
    expiracao = null;
    tokenWeb = null;
    delete api.defaults.headers.common.Authorization;

    // Apaga também tokens legados que ficavam no armazenamento não criptografado.
    const limpezas = [AsyncStorage.multiRemove([CHAVE_USUARIO, CHAVE_TOKEN_ANTIGO])];

    if (Platform.OS !== 'web') {
        limpezas.push(SecureStore.deleteItemAsync(CHAVE_TOKEN_SEGURO));
    }

    const resultados = await Promise.allSettled(limpezas);

    if (resultados.some((resultado) => resultado.status === 'rejected')) {
        throw new Error('Não foi possível limpar todos os dados da sessão.');
    }
}

export async function iniciarSessao(usuario, token) {
    const dados = dadosToken(usuario, token);

    if (!dados) {
        throw new Error('Resposta de login inválida ou expirada.');
    }

    await encerrarSessao();

    try {
        if (Platform.OS === 'web') {
            // O navegador mantém o token só em memória; recarregar exige novo login.
            tokenWeb = token;
        } else {
            await SecureStore.setItemAsync(CHAVE_TOKEN_SEGURO, token);
            await AsyncStorage.setItem(CHAVE_USUARIO, JSON.stringify(usuario));
        }

        api.defaults.headers.common.Authorization = 'Bearer ' + token;
        agendarExpiracao(dados);
    } catch {
        await encerrarSessao();

        throw new Error('Não foi possível salvar a sessão.');
    }
}

export async function restaurarSessao() {
    cancelarTemporizador();
    expiracao = null;
    delete api.defaults.headers.common.Authorization;

    if (Platform.OS === 'web') {
        await encerrarSessao();

        return null;
    }

    const versaoAtual = versaoSessao;
    const usuarioSalvo = await AsyncStorage.getItem(CHAVE_USUARIO);
    const token = await lerToken();

    await AsyncStorage.removeItem(CHAVE_TOKEN_ANTIGO);

    if (versaoAtual !== versaoSessao) {
        return null;
    }

    if (!usuarioSalvo && !token) {
        return null;
    }

    let usuario;

    try {
        usuario = JSON.parse(usuarioSalvo);
    } catch {
        usuario = null;
    }

    const dados = dadosToken(usuario, token);

    if (!dados) {
        await encerrarSessao();

        return null;
    }

    api.defaults.headers.common.Authorization = 'Bearer ' + token;

    try {
        // Confirma assinatura, expiração e existência da conta no servidor.
        const { data } = await api.get('/sessao');

        if (versaoAtual !== versaoSessao) {
            return null;
        }

        if (!data.usuario || data.usuario.id_usuario !== usuario.id_usuario) {
            await encerrarSessao();

            return null;
        }

        await salvarUsuario(data.usuario);

        if (versaoAtual !== versaoSessao) {
            return null;
        }

        agendarExpiracao(dados);

        return data.usuario;
    } catch (error) {
        if (versaoAtual === versaoSessao) {
            delete api.defaults.headers.common.Authorization;

            if (error.response?.status === 401) {
                await encerrarSessao();

                return null;
            }
        }

        // Uma falha de rede não apaga a credencial segura, mas não abre uma sessão.
        throw error;
    }
}

export async function salvarUsuario(usuario) {
    if (Platform.OS !== 'web') {
        await AsyncStorage.setItem(CHAVE_USUARIO, JSON.stringify(usuario));
    }
}
