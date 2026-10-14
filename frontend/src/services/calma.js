import AsyncStorage from '@react-native-async-storage/async-storage';
import { randomUUID } from 'expo-crypto';
import { jwtDecode } from 'jwt-decode';
import api from './api';

const tarefas = new Map();
const sincronizacoes = new Map();
const atualizacoes = new Map();
const uuidValido = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function registroValido(registro, confirmado = false) {
    if (!registro || typeof registro.id_cliente !== 'string' || !uuidValido.test(registro.id_cliente) ||
        registro.duracao_segundos !== 14 || typeof registro.concluido_em !== 'string') {
        return false;
    }

    const data = new Date(registro.concluido_em);

    return Number.isFinite(data.getTime()) && data.toISOString() === registro.concluido_em &&
        (!confirmado || (Number.isSafeInteger(registro.id_calma) && registro.id_calma > 0));
}

function chave(idUsuario) {
    if (!Number.isSafeInteger(idUsuario) || idUsuario <= 0) {
        throw new Error('Usuário inválido.');
    }

    return '@amparo/calma:' + idUsuario;
}

// Serializa alterações locais para não perder ciclos durante um envio pendente.
function exclusivo(idUsuario, tarefa) {
    chave(idUsuario);

    const anterior = tarefas.get(idUsuario) || Promise.resolve();
    const atual = anterior.catch(() => {}).then(tarefa);
    const limpar = () => {
        if (tarefas.get(idUsuario) === atual) {
            tarefas.delete(idUsuario);
        }
    };

    tarefas.set(idUsuario, atual);
    atual.then(limpar, limpar);

    return atual;
}

async function ler(idUsuario) {
    const texto = await AsyncStorage.getItem(chave(idUsuario));

    if (!texto) {
        return { pendentes: [], historico: [] };
    }

    const dados = JSON.parse(texto);

    if (!dados || !Array.isArray(dados.pendentes) || !Array.isArray(dados.historico) ||
        !dados.pendentes.every((item) => registroValido(item)) ||
        !dados.historico.every((item) => registroValido(item, true))) {
        throw new Error('Não foi possível ler o histórico local de calma.');
    }

    return dados;
}

function guardar(idUsuario, dados) {
    return AsyncStorage.setItem(chave(idUsuario), JSON.stringify(dados));
}

function ordenar(registros) {
    return [...registros].sort((primeiro, segundo) =>
        new Date(segundo.concluido_em).getTime() - new Date(primeiro.concluido_em).getTime());
}

function autorizacaoDaConta(idUsuario) {
    const autorizacao = api.defaults.headers.common.Authorization;

    try {
        const token = jwtDecode(autorizacao.slice(7));

        if (token.id_usuario === idUsuario && token.exp * 1000 > Date.now()) {
            return autorizacao;
        }
    } catch {
        // Uma fila nunca deve ser enviada com a credencial de outra conta.
    }

    throw new Error('Entre na sua conta para sincronizar o histórico.');
}

export async function registrarCicloCalma(idUsuario, concluidoEm) {
    const registro = { id_cliente: randomUUID(), concluido_em: concluidoEm, duracao_segundos: 14 };

    if (!registroValido(registro)) {
        return Promise.reject(new Error('Ciclo de calma inválido.'));
    }

    return exclusivo(idUsuario, async () => {
        const dados = await ler(idUsuario);

        dados.pendentes.push(registro);
        await guardar(idUsuario, dados);

        return registro;
    });
}

export function listarHistoricoLocalCalma(idUsuario) {
    return exclusivo(idUsuario, async () => {
        const dados = await ler(idUsuario);
        const pendentes = dados.pendentes.map((registro) => ({ ...registro, pendente: true }));
        const identificadoresPendentes = new Set(pendentes.map((registro) => registro.id_cliente));

        return {
            registros: ordenar([
                ...pendentes,
                ...dados.historico.filter((registro) => !identificadoresPendentes.has(registro.id_cliente)),
            ]),
            pendentes: pendentes.length,
        };
    });
}

export function sincronizarCiclosCalma(idUsuario) {
    chave(idUsuario);

    if (sincronizacoes.has(idUsuario)) {
        return sincronizacoes.get(idUsuario);
    }

    const sincronizacao = (async () => {
        // Um lote limitado evita monopolizar a conexão após muito tempo offline.
        for (let indice = 0; indice < 30; indice++) {
            const registro = await exclusivo(idUsuario, async () => (await ler(idUsuario)).pendentes[0]);

            if (!registro) {
                break;
            }

            const autorizacao = autorizacaoDaConta(idUsuario);
            const { data } = await api.post('/calma', {
                id_cliente: registro.id_cliente,
                concluido_em: registro.concluido_em,
            }, { headers: { Authorization: autorizacao } });

            // Só remove da fila depois da confirmação, inclusive em reenvios.
            if (!registroValido(data, true) || data.id_cliente !== registro.id_cliente ||
                data.concluido_em !== registro.concluido_em) {
                throw new Error('Não foi possível confirmar o ciclo salvo.');
            }

            await exclusivo(idUsuario, async () => {
                const dados = await ler(idUsuario);

                dados.pendentes = dados.pendentes.filter((item) => item.id_cliente !== registro.id_cliente);
                dados.historico = ordenar([
                    data,
                    ...dados.historico.filter((item) => item.id_cliente !== data.id_cliente),
                ]).slice(0, 50);

                await guardar(idUsuario, dados);
            });
        }
    })();

    sincronizacoes.set(idUsuario, sincronizacao);

    const limpar = () => {
        if (sincronizacoes.get(idUsuario) === sincronizacao) {
            sincronizacoes.delete(idUsuario);
        }
    };

    sincronizacao.then(limpar, limpar);

    return sincronizacao;
}

async function consultarHistorico(idUsuario) {
    await sincronizarCiclosCalma(idUsuario);

    const autorizacao = autorizacaoDaConta(idUsuario);
    const { data } = await api.get('/calma', { headers: { Authorization: autorizacao } });

    if (!Array.isArray(data) || !data.every((registro) => registroValido(registro, true))) {
        throw new Error('Não foi possível carregar o histórico de calma.');
    }

    await exclusivo(idUsuario, async () => {
        const dados = await ler(idUsuario);

        // Preserva confirmações que tenham chegado enquanto o GET estava pendente.
        const registros = new Map(dados.historico.map((item) => [item.id_cliente, item]));

        for (const registro of data) {
            registros.set(registro.id_cliente, registro);
        }

        dados.historico = ordenar([...registros.values()]).slice(0, 50);
        await guardar(idUsuario, dados);
    });

    return listarHistoricoLocalCalma(idUsuario);
}

// Atualizações concorrentes compartilham a mesma consulta e a mesma confirmação.
export function atualizarHistoricoCalma(idUsuario) {
    chave(idUsuario);

    if (atualizacoes.has(idUsuario)) {
        return atualizacoes.get(idUsuario);
    }

    const atualizacao = consultarHistorico(idUsuario);
    const limpar = () => {
        if (atualizacoes.get(idUsuario) === atualizacao) {
            atualizacoes.delete(idUsuario);
        }
    };

    atualizacoes.set(idUsuario, atualizacao);
    atualizacao.then(limpar, limpar);

    return atualizacao;
}
