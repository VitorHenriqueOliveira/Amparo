export const FASES_RESPIRACAO = [
    { titulo: 'Inspire', duracaoMs: 4000, instrucao: 'Inspire suavemente, sem forçar.', inicio: 0, fim: 1 },
    { titulo: 'Segure', duracaoMs: 2000, instrucao: 'Se for confortável, mantenha o ar.', inicio: 1, fim: 1 },
    { titulo: 'Expire', duracaoMs: 6000, instrucao: 'Solte o ar devagar, no seu ritmo.', inicio: 1, fim: 0 },
    { titulo: 'Descanse', duracaoMs: 2000, instrucao: 'Relaxe antes do próximo ciclo.', inicio: 0, fim: 0 },
];

// O relógio monotônico preserva frações de segundo ao pausar e evita deriva.
export function criarCicloRespiracao({
    agora = () => performance.now(),
    dataAtual = () => Date.now(),
    agendar = setTimeout,
    cancelar = clearTimeout,
    aoAtualizar = () => {},
    aoConcluir = () => {},
} = {}) {
    let indiceFase = 0;
    let restanteMs = FASES_RESPIRACAO[0].duracaoMs;
    let ciclosConcluidos = 0;
    let versaoFase = 0;
    let referencia = 0;
    let emExecucao = false;
    let temporizador = null;

    function obterEstado() {
        return {
            indiceFase,
            restanteMs,
            segundos: Math.ceil(restanteMs / 1000),
            progresso: 1 - restanteMs / FASES_RESPIRACAO[indiceFase].duracaoMs,
            ciclosConcluidos,
            versaoFase,
            emExecucao,
        };
    }

    function atualizarRelogio() {
        const instante = agora();
        let decorrido = Math.max(0, instante - referencia);

        referencia = instante;

        while (decorrido >= restanteMs) {
            decorrido -= restanteMs;
            indiceFase = (indiceFase + 1) % FASES_RESPIRACAO.length;
            versaoFase++;
            restanteMs = FASES_RESPIRACAO[indiceFase].duracaoMs;

            if (indiceFase === 0) {
                ciclosConcluidos++;
                aoConcluir({ concluido_em: new Date(dataAtual() - decorrido).toISOString() });
            }
        }

        restanteMs -= decorrido;
    }

    function programar() {
        if (!emExecucao) {
            return;
        }

        // A animação é contínua; a tela só precisa atualizar na mudança do segundo.
        temporizador = agendar(() => {
            if (!emExecucao) {
                return;
            }

            atualizarRelogio();
            aoAtualizar(obterEstado());
            programar();
        }, restanteMs % 1000 || 1000);
    }

    function iniciar() {
        if (emExecucao) {
            return;
        }

        referencia = agora();
        emExecucao = true;
        aoAtualizar(obterEstado());
        programar();
    }

    function pausar() {
        if (!emExecucao) {
            return;
        }

        cancelar(temporizador);
        atualizarRelogio();
        emExecucao = false;
        aoAtualizar(obterEstado());
    }

    function destruir() {
        cancelar(temporizador);
        emExecucao = false;
    }

    function reiniciar() {
        cancelar(temporizador);
        indiceFase = 0;
        restanteMs = FASES_RESPIRACAO[0].duracaoMs;
        referencia = agora();
        versaoFase++;

        // Recomeçar descarta somente o ciclo incompleto, preservando os concluídos.
        aoAtualizar(obterEstado());

        if (emExecucao) {
            programar();
        }
    }

    return { obterEstado, iniciar, pausar, reiniciar, destruir };
}
