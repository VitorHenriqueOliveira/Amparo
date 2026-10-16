import AsyncStorage from '@react-native-async-storage/async-storage';
import { digestStringAsync, CryptoDigestAlgorithm } from 'expo-crypto';
import { jwtDecode } from 'jwt-decode';
import api from './api';
import { calcularDuracao } from '../utils/sono';

const proprietarios = '@amparo/importacao-proprietarios:v1';
const emocoes = { feliz: 'Feliz', triste: 'Triste', neutro: 'Neutro', raiva: 'Raiva' };
const estados = new Set(['importado', 'existente', 'conflito', 'invalido']);
let fila = Promise.resolve();
const sincronizacoes = new Map();

function contaValida(idUsuario) {
    if (!Number.isSafeInteger(idUsuario) || idUsuario <= 0) throw new Error('Usuário inválido.');
}

function exclusivo(tarefa) {
    const atual = fila.catch(() => {}).then(tarefa);
    fila = atual;
    return atual;
}

function autorizacaoDaConta(idUsuario) {
    const autorizacao = api.defaults.headers.common.Authorization;
    try {
        const token = jwtDecode(autorizacao.slice(7));
        if (token.id_usuario === idUsuario && token.exp * 1000 > Date.now()) return autorizacao;
    } catch { /* A credencial de outra conta nunca pode enviar estes dados. */ }
    throw new Error('Entre novamente na sua conta para importar o histórico.');
}

async function controle(chave) {
    const texto = await AsyncStorage.getItem(chave);
    if (!texto) return {};
    const dados = JSON.parse(texto);
    if (!dados || typeof dados !== 'object' || Array.isArray(dados)) {
        throw new Error('Não foi possível ler o controle da importação. Os originais foram preservados.');
    }
    return dados;
}

const hash = (texto) => digestStringAsync(CryptoDigestAlgorithm.SHA256, texto);

function diaValido(valor) {
    if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor) || valor < '0001-01-01') return false;
    const data = new Date(valor + 'T00:00:00Z');
    return Number.isFinite(data.getTime()) && data.toISOString().slice(0, 10) === valor;
}

function instante(valor) {
    if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(valor)) return null;
    const data = new Date(valor);
    if (!diaValido(valor.slice(0, 10)) || !Number.isFinite(data.getTime()) || data.getTime() > Date.now()) return null;
    return data.toISOString();
}

function normalizar(tipo, item, fuso) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
    if (tipo === 'emocoes' && Object.hasOwn(emocoes, item.emotionKey)) {
        const data = instante(item.createdAt || item.date);
        if (data) return { id_emocao: emocoes[item.emotionKey], registrado_em: data };
    }
    if (tipo === 'sono' && diaValido(item.date) && calcularDuracao(item.sleepTime, item.wakeTime) !== null) {
        return { dia: item.date, hora_dormiu: item.sleepTime, hora_acordou: item.wakeTime,
            fuso_horario: item.fuso_horario || fuso };
    }
    if (tipo === 'diario' && typeof item.text === 'string' && item.text.trim() && item.text.length <= 10000) {
        // As notas originais usam Date.now() como ID, preservando o instante de criação.
        const data = instante(item.createdAt || item.date)
            || (/^\d{13}$/.test(String(item.id)) ? instante(new Date(Number(item.id)).toISOString()) : null);
        if (data) return { descricao: item.text, registrado_em: data };
        const partes = typeof item.date === 'string' && item.date.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
        const dia = partes && `${partes[3]}-${partes[2]}-${partes[1]}`;
        if (diaValido(dia)) return { descricao: item.text, dia, fuso_horario: fuso };
    }
    return null;
}

function fontes(idUsuario) {
    return [
        ...['emocoes', 'sono', 'diario'].map((tipo) => ({ tipo, chave: '@amparo/' + tipo + ':' + idUsuario, daConta: true })),
        ...['emocoes', 'sono', 'diario'].map((tipo) => ({ tipo, chave: '@amparo/' + tipo, daConta: false })),
        { tipo: 'sono', chave: '@amparo:registros_sono', daConta: false },
    ];
}

async function inspecionar(idUsuario) {
    contaValida(idUsuario);
    const chaveRecibos = '@amparo/importacao-recibos:v1:' + idUsuario;
    const [donos, recibos] = await Promise.all([controle(proprietarios), controle(chaveRecibos)]);
    if (Object.values(donos).some((id) => !Number.isSafeInteger(id) || id <= 0)
        || Object.values(recibos).some((estado) => !estados.has(estado))) {
        throw new Error('O controle da importação precisa ser verificado. Os originais foram preservados.');
    }
    const fuso = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    const itens = [];
    const vistos = new Set();
    let vinculosIdentificados = false;
    const arquivos = await Promise.all(fontes(idUsuario).map(async (fonte) => ({
        ...fonte, texto: await AsyncStorage.getItem(fonte.chave),
    })));

    for (const fonte of arquivos) {
        if (!fonte.texto) continue;
        let lista;
        try {
            lista = JSON.parse(fonte.texto);
            if (!Array.isArray(lista)) throw new Error();
        } catch {
            itens.push({ tipo: fonte.tipo, situacao: 'invalido', identificador: fonte.chave });
            continue;
        }
        const ocorrencias = new Map();
        for (const item of lista) {
            // Uma identificação explícita tem precedência sobre a origem do arquivo.
            if (item?.id_usuario !== undefined && item.id_usuario !== idUsuario) continue;
            const dados = normalizar(fonte.tipo, item, fuso);
            const conteudo = JSON.stringify(dados?.dia ? { ...dados, fuso_horario: undefined } : dados || item);
            const temId = item?.id !== undefined && ['string', 'number'].includes(typeof item.id);
            const identidade = temId ? 'id:' + String(item.id) : 'conteudo:' + conteudo;
            const ocorrencia = temId ? 0 : ocorrencias.get(identidade) || 0;
            ocorrencias.set(identidade, ocorrencia + 1);
            const chave = await hash(fonte.tipo + ':' + identidade + ':' + ocorrencia);
            if (!donos[chave]) {
                donos[chave] = idUsuario;
                vinculosIdentificados = true;
            }
            const dono = fonte.daConta || item?.id_usuario === idUsuario ? idUsuario : donos[chave];
            if (dono && dono !== idUsuario) continue;
            const assinatura = await hash(conteudo);
            const identificador = chave + ':' + assinatura;
            if (vistos.has(identificador)) continue;
            vistos.add(identificador);
            itens.push({ tipo: fonte.tipo, chave, identificador, dados,
                situacao: !dados ? 'invalido' : recibos[identificador] || 'pendente' });
        }
    }
    return { itens, donos, recibos, chaveRecibos, vinculosIdentificados };
}

function resumir(itens) {
    const contar = (situacao) => itens.filter((item) => item.situacao === situacao).length;
    return { itens, importados: contar('importado') + contar('existente'), conflitos: contar('conflito'),
        invalidos: contar('invalido'), pendentes: contar('pendente') };
}

export function sincronizarHistoricosAntigos(idUsuario) {
    contaValida(idUsuario);
    if (sincronizacoes.has(idUsuario)) return sincronizacoes.get(idUsuario);
    const atual = exclusivo(async () => {
        autorizacaoDaConta(idUsuario);
        const { itens, donos, recibos, chaveRecibos, vinculosIdentificados } = await inspecionar(idUsuario);
        if (vinculosIdentificados) {
            autorizacaoDaConta(idUsuario);
            // Fixa o destino antes do envio, preservando vínculos de aberturas anteriores.
            await AsyncStorage.setItem(proprietarios, JSON.stringify(donos));
        }
        for (const item of itens.filter((registro) => registro.situacao === 'pendente')) {
            const autorizacao = autorizacaoDaConta(idUsuario);
            let situacao;
            try {
                const { data } = await api.post('/historicos/importar', {
                    tipo: item.tipo, chave: item.chave, dados: item.dados,
                }, { headers: { Authorization: autorizacao } });
                if (data?.tipo !== item.tipo || data.chave !== item.chave
                    || !['importado', 'existente', 'conflito'].includes(data.situacao)
                    || !Number.isSafeInteger(data.registro) || data.registro <= 0) {
                    throw new Error('Não foi possível confirmar a importação.');
                }
                situacao = data.situacao;
            } catch (erro) {
                // Erros de dados não bloqueiam os demais registros; a próxima abertura retoma falhas de conexão.
                if (erro.response?.status !== 400) throw erro;
                situacao = 'invalido';
            }
            recibos[item.identificador] = situacao;
            await AsyncStorage.setItem(chaveRecibos, JSON.stringify(recibos));
            item.situacao = situacao;
        }
        return resumir(itens);
    });
    // Inclusive uma tarefa concluída ou interrompida é reutilizada até o aplicativo ser reaberto.
    sincronizacoes.set(idUsuario, atual);
    return atual;
}
