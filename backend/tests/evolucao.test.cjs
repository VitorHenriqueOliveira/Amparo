const test = require('node:test');
const assert = require('node:assert/strict');
const { criarAmbienteSono } = require('./helpers/servidor-sono.cjs');

test('evolução calcula o relatório com HTTP, JWT e PostgreSQL, isolados do banco real', async (t) => {
    const api = await criarAmbienteSono();
    t.after(() => api.encerrar());
    const rota = '/emocoes/evolucao?inicio=2026-10-14&fim=2026-10-14&fuso_horario=America/Sao_Paulo';
    const inserir = (id, emocao, instante) => api.banco.query(
        'INSERT INTO registro_emocional (id_usuario, id_emocao, data_registro) VALUES ($1, $2, $3)', [id, emocao, instante]);
    const ler = async (url = rota, id = 7) => {
        const resposta = await api.request(url, 'GET', undefined, id);
        assert.equal(resposta.status, 200, await resposta.clone().text());
        return resposta.json();
    };

    await t.test('token e parâmetros são validados antes de consultar dados', async () => {
        const antes = api.estado.consultas.length;
        assert.equal((await api.request(rota, 'GET', undefined, null)).status, 401);
        for (const query of ['', 'inicio=2026-02-30&fim=2026-03-01&fuso_horario=UTC',
            'inicio=2026-10-15&fim=2026-10-14&fuso_horario=UTC',
            'inicio=2024-01-01&fim=2026-01-01&fuso_horario=UTC',
            'inicio=2026-10-14&fim=2026-10-14&fuso_horario=Invalido',
            'inicio=2026-10-14&inicio=2026-10-15&fim=2026-10-15&fuso_horario=UTC']) {
            assert.equal((await api.request('/emocoes/evolucao?' + query)).status, 400);
        }
        assert.equal((await api.request(rota + '&id_usuario=8')).status, 400);
        assert.equal(api.estado.consultas.length, antes);
    });

    await t.test('período vazio mantém contagens zeradas, sono ausente e mensagem própria', async () => {
        const dados = await ler();
        assert.equal(dados.total, 0);
        assert.equal(dados.mediaSono, null);
        assert.equal(dados.alertaSono, null);
        assert.deepEqual(Object.values(dados.percentuais), [0, 0, 0, 0]);
        assert.deepEqual(dados.predominantes, []);
        assert.equal(dados.dias.length, 1);
        assert.equal(dados.dias[0].emocao, null);
        assert.equal(dados.conselho.titulo, 'Comece por você');
    });

    await t.test('filtra limites locais e outra conta, arredonda a 100% e trata empate', async () => {
        await inserir(7, 'Raiva', '2026-10-14T02:59:59.999Z');
        await inserir(7, 'Feliz', '2026-10-14T03:00:00Z');
        await inserir(7, 'Neutro', '2026-10-14T12:00:00Z');
        await inserir(7, 'Triste', '2026-10-15T02:59:59.999Z');
        await inserir(7, 'Raiva', '2026-10-15T03:00:00Z');
        await inserir(8, 'Raiva', '2026-10-14T12:00:00Z');
        const dados = await ler();
        assert.equal(dados.total, 3);
        assert.deepEqual(dados.contagens, { feliz: 1, triste: 1, neutro: 1, raiva: 0 });
        assert.equal(Object.values(dados.percentuais).reduce((soma, valor) => soma + valor, 0), 100);
        assert.deepEqual(Object.values(dados.percentuais).sort(), [0, 33, 33, 34]);
        assert.equal(dados.dias[0].emocao.emotionKey, 'triste');
        assert.equal(dados.conselho.titulo, 'Continue se observando');
        assert.equal((await ler(rota, 8)).total, 1);
        assert.equal((await ler(rota, 8)).percentuais.raiva, 100);
        assert.equal((await api.request(rota, 'GET', undefined, 99)).status, 401);
    });

    await t.test('predominância menor que 50% ainda gera insight; sono e notas não multiplicam emoções', async () => {
        await inserir(7, 'Feliz', '2026-10-14T13:00:00Z');
        await inserir(7, 'Raiva', '2026-10-14T14:00:00Z');
        await api.banco.exec("INSERT INTO sono (id_usuario, hora_dormiu, hora_acordou, data_registro) VALUES" +
            " (7, '23:45', '05:15', '2026-10-14'), (8, '22:00', '06:00', '2026-10-14');" +
            "INSERT INTO diario (id_usuario, descricao, data_registro) VALUES" +
            " (7, 'Primeira nota', '2026-10-14T03:00:00Z'), (7, 'Segunda nota', '2026-10-15T02:59:59Z')," +
            " (7, 'Fora do período', '2026-10-15T03:00:00Z'), (8, 'Outra conta', '2026-10-14T12:00:00Z');");
        const dados = await ler();
        assert.equal(dados.total, 5);
        assert.equal(dados.percentuais.feliz, 40);
        assert.deepEqual(dados.predominantes, ['feliz']);
        assert.equal(dados.conselho.titulo, 'Valorize o que faz bem');
        assert.equal(dados.alertaSono.titulo, 'Dê atenção ao seu descanso');
        assert.equal(dados.mediaSono, 330);
        assert.equal(dados.totalSono, 1);
        assert.equal(dados.totalNotas, 2);
        assert.equal(dados.dias[0].quantidadeNotas, 2);
        await api.banco.exec('UPDATE usuario SET meta_sono_horas_min = 5 WHERE id_usuario = 7');
        assert.equal((await ler()).alertaSono, null);
        const outro = await ler(rota, 8);
        assert.equal(outro.mediaSono, 480);
        assert.equal(outro.totalNotas, 1);
    });

    await t.test('desempata a última emoção pela chave primária e inclui dias sem registros', async () => {
        await inserir(7, 'Neutro', '2026-10-15T02:59:59.999Z');
        assert.equal((await ler()).dias[0].emocao.emotionKey, 'neutro');
        const dados = await ler(rota.replace('inicio=2026-10-14', 'inicio=2026-10-12'));
        assert.equal(dados.dias.length, 3);
        assert.equal(dados.dias[0].emocao, null);
        assert.equal(dados.mediaSono, 330);
    });

    await t.test('cada emoção predominante e uma única fatia recebem seus percentuais e mensagens', async () => {
        for (const [indice, emocao, icone] of [[0, 'Feliz', 'sunny-outline'], [1, 'Triste', 'rainy-outline'],
            [2, 'Neutro', 'cloud-outline'], [3, 'Raiva', 'leaf-outline']]) {
            const dia = '2026-11-' + String(indice + 1).padStart(2, '0');
            await inserir(7, emocao, dia + 'T12:00:00Z');
            const dados = await ler(`/emocoes/evolucao?inicio=${dia}&fim=${dia}&fuso_horario=UTC`);
            assert.equal(dados.percentuais[emocao.toLowerCase()], 100);
            assert.equal(dados.conselho.icone, icone);
        }
    });

    await t.test('um dia com mudança de horário de verão usa 23 horas e o limite final exclusivo', async () => {
        for (const instante of ['2026-03-08T04:59:59Z', '2026-03-08T05:00:00Z',
            '2026-03-09T03:59:59Z', '2026-03-09T04:00:00Z']) await inserir(7, 'Feliz', instante);
        const dados = await ler('/emocoes/evolucao?inicio=2026-03-08&fim=2026-03-08&fuso_horario=America/New_York');
        assert.equal(dados.total, 2);
    });

    await t.test('erros não são apresentados como histórico vazio nem expõem detalhes internos', async () => {
        api.estado.falhar = true;
        const resposta = await api.request(rota);
        assert.equal(resposta.status, 500);
        assert.doesNotMatch(await resposta.text(), /privado|SELECT|registro_emocional/);
    });
});
