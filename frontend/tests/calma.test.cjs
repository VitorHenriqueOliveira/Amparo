const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { jwtDecode } = require('jwt-decode');

async function carregar(arquivo, imports = {}) {
    const contexto = vm.createContext({ console, setTimeout, clearTimeout, performance });
    const modulo = new vm.SourceTextModule(fs.readFileSync(path.join(__dirname, '..', arquivo), 'utf8'), {
        context: contexto,
    });

    await modulo.link((specifier) => {
        assert.ok(specifier in imports);

        const namespace = ['expo-crypto', 'jwt-decode'].includes(specifier)
            ? imports[specifier] : { default: imports[specifier] };

        return new vm.SyntheticModule(Object.keys(namespace), function () {
            for (const [chave, valor] of Object.entries(namespace)) {
                this.setExport(chave, valor);
            }
        }, { context: contexto });
    });

    await modulo.evaluate();

    return modulo.namespace;
}

async function prepararRelogio(aoConcluir = () => {}) {
    const modulo = await carregar('src/services/respiracao.js');
    const conclusoes = [];
    const atrasos = [];
    let agora = 0;
    let proximo;
    const ciclo = modulo.criarCicloRespiracao({
        agora: () => agora,
        dataAtual: () => Date.UTC(2026, 9, 14) + agora,
        agendar: (callback, atraso) => { proximo = callback; atrasos.push(atraso); return 1; },
        cancelar: () => { proximo = null; },
        aoConcluir: (registro) => { conclusoes.push(registro); aoConcluir(registro); },
    });

    return {
        ciclo, conclusoes, atrasos,
        avancar(ms) { agora += ms; const callback = proximo; proximo = null; callback?.(); },
        passarSemTick(ms) { agora += ms; },
    };
}

test('respiração percorre 4/2/6/2 segundos e registra apenas o ciclo inteiro', async () => {
    const { ciclo, avancar, conclusoes } = await prepararRelogio();

    ciclo.iniciar();
    avancar(4000);
    assert.equal(ciclo.obterEstado().indiceFase, 1);
    assert.equal(ciclo.obterEstado().segundos, 2);
    avancar(2000);
    assert.equal(ciclo.obterEstado().indiceFase, 2);
    avancar(6000);
    assert.equal(ciclo.obterEstado().indiceFase, 3);
    assert.equal(conclusoes.length, 0);
    avancar(2000);
    assert.equal(ciclo.obterEstado().indiceFase, 0);
    assert.equal(ciclo.obterEstado().ciclosConcluidos, 1);
    assert.equal(conclusoes.length, 1);
    assert.equal(conclusoes[0].concluido_em, '2026-10-14T00:00:14.000Z');
});

test('pausa preserva frações de segundo e não conta tempo fora da tela', async () => {
    const { ciclo, passarSemTick, avancar, conclusoes } = await prepararRelogio();

    ciclo.iniciar();
    passarSemTick(1250);
    ciclo.pausar();
    assert.equal(ciclo.obterEstado().restanteMs, 2750);
    assert.equal(ciclo.obterEstado().progresso, 0.3125);
    avancar(60000);
    assert.equal(ciclo.obterEstado().restanteMs, 2750);
    assert.equal(conclusoes.length, 0);
    ciclo.iniciar();
    avancar(2749);
    assert.equal(ciclo.obterEstado().restanteMs, 1);
    avancar(1);
    assert.equal(ciclo.obterEstado().indiceFase, 1);
    ciclo.destruir();
    avancar(60000);
    assert.equal(conclusoes.length, 0);
});

test('atraso do temporizador não acumula deriva nem duplica conclusões', async () => {
    const { ciclo, avancar, conclusoes } = await prepararRelogio();

    ciclo.iniciar();
    ciclo.iniciar();
    avancar(28500);
    assert.equal(conclusoes.length, 2);
    assert.equal(ciclo.obterEstado().restanteMs, 3500);
    assert.equal(conclusoes[0].concluido_em, '2026-10-14T00:00:14.000Z');
    assert.equal(conclusoes[1].concluido_em, '2026-10-14T00:00:28.000Z');
    assert.equal(ciclo.obterEstado().versaoFase, 8);
});

test('recomeçar descarta apenas o ciclo incompleto e preserva os concluídos e a pausa', async () => {
    const { ciclo, avancar, conclusoes } = await prepararRelogio();

    ciclo.iniciar();
    avancar(1500);
    ciclo.reiniciar();
    assert.equal(ciclo.obterEstado().restanteMs, 4000);
    assert.equal(ciclo.obterEstado().versaoFase, 1);
    assert.equal(conclusoes.length, 0);
    avancar(14000);
    assert.equal(conclusoes.length, 1);
    ciclo.pausar();
    ciclo.reiniciar();
    assert.equal(ciclo.obterEstado().emExecucao, false);
    assert.equal(ciclo.obterEstado().ciclosConcluidos, 1);
    avancar(60000);
    assert.equal(conclusoes.length, 1);
    ciclo.iniciar();
    avancar(14000);
    assert.equal(conclusoes.length, 2);
});

test('contador agenda a próxima mudança do segundo, preservando a fração após uma pausa', async () => {
    const { ciclo, passarSemTick, avancar, atrasos } = await prepararRelogio();

    ciclo.iniciar();
    assert.equal(atrasos.at(-1), 1000);
    passarSemTick(1250);
    ciclo.pausar();
    ciclo.iniciar();
    assert.equal(atrasos.at(-1), 750);
    avancar(750);
    assert.equal(ciclo.obterEstado().segundos, 2);
    assert.equal(atrasos.at(-1), 1000);
});

test('destruir durante uma conclusão impede a criação de novos temporizadores', async () => {
    let controlador;
    const { ciclo, avancar, conclusoes } = await prepararRelogio(() => controlador.destruir());

    controlador = ciclo;
    ciclo.iniciar();
    avancar(14000);
    avancar(14000);
    assert.equal(conclusoes.length, 1);
    assert.equal(ciclo.obterEstado().emExecucao, false);
});

function token(idUsuario) {
    const payload = { id_usuario: idUsuario, exp: Math.floor(Date.now() / 1000) + 3600 };

    return 'Bearer e30.' + Buffer.from(JSON.stringify(payload)).toString('base64url') + '.teste';
}

async function prepararHistorico({ falhaUUID = false } = {}) {
    const dados = new Map();
    const registrosServidor = new Map();
    const chamadas = [];
    let numero = 0;
    const storage = {
        async getItem(chave) { return dados.get(chave) ?? null; },
        async setItem(chave, valor) { dados.set(chave, valor); },
    };
    const api = {
        defaults: { headers: { common: { Authorization: token(7) } } },
        async post(rota, body, config) {
            chamadas.push({ rota, body, config });

            const salvo = registrosServidor.get(body.id_cliente) || {
                ...body, id_calma: registrosServidor.size + 1, duracao_segundos: 14,
            };

            registrosServidor.set(body.id_cliente, salvo);

            return { data: salvo };
        },
        async get() { return { data: [...registrosServidor.values()] }; },
    };
    const modulo = await carregar('src/services/calma.js', {
        '@react-native-async-storage/async-storage': storage,
        'expo-crypto': { randomUUID: () => {
            if (falhaUUID) {
                throw new Error('UUID indisponível');
            }

            return '00000000-0000-4000-8000-' + String(++numero).padStart(12, '0');
        } },
        'jwt-decode': { jwtDecode },
        './api': api,
    });

    return { modulo, dados, chamadas, api, registrosServidor };
}

test('ciclos offline são persistidos e contas diferentes têm filas separadas', async () => {
    const { modulo, dados, chamadas, api } = await prepararHistorico();

    await Promise.all([
        modulo.registrarCicloCalma(7, '2026-10-14T00:00:14.000Z'),
        modulo.registrarCicloCalma(7, '2026-10-14T00:00:28.000Z'),
        modulo.registrarCicloCalma(8, '2026-10-14T00:00:42.000Z'),
    ]);
    assert.equal(chamadas.length, 0);
    assert.equal((await modulo.listarHistoricoLocalCalma(7)).pendentes, 2);
    assert.equal((await modulo.listarHistoricoLocalCalma(8)).pendentes, 1);
    api.post = async () => { throw new Error('Sem internet'); };
    await assert.rejects(modulo.sincronizarCiclosCalma(7), /internet/);
    assert.equal((await modulo.listarHistoricoLocalCalma(7)).pendentes, 2);
    assert.ok(dados.has('@amparo/calma:7'));
    assert.ok(dados.has('@amparo/calma:8'));
});

test('confirmação perdida é reenviada com o mesmo UUID sem duplicar o ciclo', async () => {
    const { modulo, api, chamadas, registrosServidor } = await prepararHistorico();
    const post = api.post;
    let falhar = true;

    api.post = async (...args) => {
        const resposta = await post(...args);

        if (falhar) {
            falhar = false;
            throw new Error('Resposta perdida');
        }

        return resposta;
    };

    await modulo.registrarCicloCalma(7, '2026-10-14T00:00:14.000Z');
    await assert.rejects(modulo.sincronizarCiclosCalma(7), /perdida/);
    await Promise.all([modulo.sincronizarCiclosCalma(7), modulo.sincronizarCiclosCalma(7)]);
    assert.equal(registrosServidor.size, 1);
    assert.equal(chamadas.length, 2);
    assert.equal(chamadas[0].body.id_cliente, chamadas[1].body.id_cliente);
    const historico = await modulo.atualizarHistoricoCalma(7);
    assert.equal(historico.pendentes, 0);
    assert.equal(historico.registros.length, 1);
});

test('troca de conta durante envio preserva o restante da fila do dono original', async () => {
    const { modulo, api, chamadas } = await prepararHistorico();
    const post = api.post;

    api.post = async (...args) => {
        api.defaults.headers.common.Authorization = token(8);

        return post(...args);
    };

    await modulo.registrarCicloCalma(7, '2026-10-14T00:00:14.000Z');
    await modulo.registrarCicloCalma(7, '2026-10-14T00:00:28.000Z');
    await assert.rejects(modulo.sincronizarCiclosCalma(7), /conta/);
    assert.equal(chamadas.length, 1);
    assert.equal(chamadas[0].config.headers.Authorization, token(7));
    assert.equal((await modulo.listarHistoricoLocalCalma(7)).pendentes, 1);
    assert.equal((await modulo.listarHistoricoLocalCalma(8)).registros.length, 0);
});

test('um ciclo novo durante o envio anterior não é removido da fila por engano', async () => {
    const { modulo, api } = await prepararHistorico();
    const post = api.post;
    let primeiro = true;

    api.post = async (...args) => {
        if (primeiro) {
            primeiro = false;
            await modulo.registrarCicloCalma(7, '2026-10-14T00:00:28.000Z');
        }

        return post(...args);
    };

    await modulo.registrarCicloCalma(7, '2026-10-14T00:00:14.000Z');
    await modulo.sincronizarCiclosCalma(7);
    const historico = await modulo.listarHistoricoLocalCalma(7);

    assert.equal(historico.pendentes, 0);
    assert.equal(historico.registros.length, 2);
});

test('sem sessão a fila pessoal permanece guardada e não é enviada', async () => {
    const { modulo, api, chamadas } = await prepararHistorico();

    await modulo.registrarCicloCalma(7, '2026-10-14T00:00:14.000Z');
    delete api.defaults.headers.common.Authorization;

    await assert.rejects(modulo.sincronizarCiclosCalma(7), /conta/);
    assert.equal(chamadas.length, 0);
    assert.equal((await modulo.listarHistoricoLocalCalma(7)).pendentes, 1);
});

test('consultas concorrentes compartilham um GET e preservam o cache válido em resposta inválida', async () => {
    const { modulo, api, dados } = await prepararHistorico();

    await modulo.registrarCicloCalma(7, '2026-10-14T00:00:14.000Z');
    await modulo.sincronizarCiclosCalma(7);

    const get = api.get;
    let consultas = 0;

    api.get = async () => { consultas++; return get(); };

    await Promise.all([modulo.atualizarHistoricoCalma(7), modulo.atualizarHistoricoCalma(7)]);
    assert.equal(consultas, 1);

    const antes = dados.get('@amparo/calma:7');

    api.get = async () => ({ data: [{ id_cliente: 'registro inválido' }] });
    await assert.rejects(modulo.atualizarHistoricoCalma(7), /carregar/);
    assert.equal(dados.get('@amparo/calma:7'), antes);
});

test('confirmação incompleta não remove um ciclo da fila offline', async () => {
    const { modulo, api } = await prepararHistorico();

    await modulo.registrarCicloCalma(7, '2026-10-14T00:00:14.000Z');
    api.post = async (rota, body) => ({ data: { ...body, id_calma: 1, duracao_segundos: 99 } });

    await assert.rejects(modulo.sincronizarCiclosCalma(7), /confirmar/);
    assert.equal((await modulo.listarHistoricoLocalCalma(7)).pendentes, 1);
});

test('dados locais inválidos não são sobrescritos nem enviados ao servidor', async () => {
    const { modulo, dados, chamadas } = await prepararHistorico();
    const conteudo = JSON.stringify({ pendentes: [null], historico: [] });

    dados.set('@amparo/calma:7', conteudo);
    await assert.rejects(modulo.sincronizarCiclosCalma(7), /histórico local/);
    await assert.rejects(modulo.registrarCicloCalma(7, '2026-10-14T00:00:14.000Z'), /histórico local/);
    assert.equal(chamadas.length, 0);
    assert.equal(dados.get('@amparo/calma:7'), conteudo);
});

test('falha ao gerar o identificador do histórico não interrompe a respiração', async () => {
    const { modulo, dados } = await prepararHistorico({ falhaUUID: true });
    const tarefas = [];
    const { ciclo, avancar, conclusoes } = await prepararRelogio((registro) => {
        tarefas.push(modulo.registrarCicloCalma(7, registro.concluido_em).catch(() => {}));
    });

    ciclo.iniciar();
    avancar(14000);
    avancar(14000);
    await Promise.all(tarefas);
    assert.equal(conclusoes.length, 2);
    assert.equal(ciclo.obterEstado().emExecucao, true);
    assert.equal(dados.size, 0);
});
