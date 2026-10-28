const test = require('node:test');
const assert = require('node:assert/strict');
const sharp = require('sharp');
const { criarAmbienteSono } = require('./helpers/servidor-sono.cjs');

test('foto de perfil valida o arquivo e mantém uma imagem privada e persistente por conta', async (t) => {
    const api = await criarAmbienteSono();
    t.after(() => api.encerrar());
    const original = await sharp({ create: { width: 1200, height: 600, channels: 3, background: '#76C043' } })
        .withExif({ IFD0: { Artist: 'Metadado privado' } }).png().toBuffer();
    const enviar = (body, tipo = 'image/png', id = 7, query = '') => fetch(api.base + '/perfil/foto' + query, {
        method: 'PUT', headers: { 'Content-Type': tipo, ...(id ? { Authorization: 'Bearer ' + api.token(id) } : {}) }, body,
    });
    const lerFoto = (id = 7, url = api.base + '/perfil/foto') => fetch(url, {
        headers: { Authorization: 'Bearer ' + api.token(id) },
    });

    await t.test('exige autenticação e rejeita formatos, tamanhos e imagens inválidos', async () => {
        assert.equal((await enviar(original, 'image/png', null)).status, 401);
        assert.equal((await enviar(original, 'image/svg+xml')).status, 415);
        assert.equal((await enviar(original, 'image/jpeg')).status, 400);
        assert.equal((await enviar(Buffer.from('arquivo falso'))).status, 400);
        assert.equal((await enviar(Buffer.alloc(0))).status, 400);
        assert.equal((await enviar(original, 'image/png', 7, '?id_usuario=8')).status, 400);
        assert.equal((await enviar(Buffer.alloc(2 * 1024 * 1024 + 1))).status, 413);
        const grande = await sharp({ create: { width: 5000, height: 4000, channels: 3, background: '#FFFFFF' } }).png().toBuffer();

        assert.equal((await enviar(grande)).status, 400);
        assert.equal(api.estado.consultas.length, 0);
    });

    let referencia;
    let salva;

    await t.test('reprocessa a foto, remove metadados e devolve a referência no login e no perfil', async () => {
        const resposta = await enviar(original);
        referencia = (await resposta.json()).foto_url;

        assert.equal(resposta.status, 200);
        assert.match(referencia, /^\/api\/perfil\/foto\?v=[a-f0-9]{64}$/);
        const foto = await lerFoto(7, new URL(referencia, api.base).href);
        salva = Buffer.from(await foto.arrayBuffer());
        const metadados = await sharp(salva).metadata();

        assert.equal(foto.status, 200);
        assert.equal(foto.headers.get('content-type'), 'image/webp');
        assert.equal(foto.headers.get('cache-control'), 'no-store');
        assert.equal(foto.headers.get('x-content-type-options'), 'nosniff');
        assert.equal(metadados.width, 512);
        assert.equal(metadados.height, 256);
        assert.equal(metadados.exif, undefined);
        assert.equal(metadados.icc, undefined);

        for (const rota of ['/perfil', '/sessao']) {
            assert.equal((await (await api.request(rota)).json()).usuario.foto_url, referencia);
        }

        const login = await api.request('/login', 'POST', { email: 'sono@example.com', senha: 'teste1234' }, null);

        assert.equal(login.status, 200);
        assert.equal((await login.json()).usuario.foto_url, referencia);
        const edicao = await api.request('/perfil', 'PUT', { nome: 'Novo nome' });

        assert.equal((await edicao.json()).usuario.foto_url, referencia);
        const preferencia = await api.request('/perfil/notificacoes', 'PUT', { st_notificacao: false });

        assert.equal((await preferencia.json()).usuario.foto_url, referencia);
        const [banco] = (await api.banco.query('SELECT largura, altura, tipo_mime, octet_length(conteudo) AS tamanho FROM usuario_foto')).rows;

        assert.deepEqual(banco, { largura: 512, altura: 256, tipo_mime: 'image/webp', tamanho: salva.length });
    });

    await t.test('outra conta não lê nem remove a foto e falhas preservam a imagem anterior', async () => {
        assert.equal((await lerFoto(8)).status, 404);
        assert.equal((await api.request('/perfil', 'GET', undefined, 8)).status, 200);
        assert.equal((await (await api.request('/perfil', 'GET', undefined, 8)).json()).usuario.foto_url, null);
        assert.equal((await api.request('/perfil/foto', 'DELETE', undefined, 8)).status, 204);
        assert.deepEqual(Buffer.from(await (await lerFoto()).arrayBuffer()), salva);

        const nova = await sharp({ create: { width: 20, height: 20, channels: 3, background: '#FFD700' } }).jpeg().toBuffer();
        api.estado.falhar = true;

        try {
            const falha = await enviar(nova, 'image/jpeg');

            assert.equal(falha.status, 500);
            assert.deepEqual(await falha.json(), { erro: 'Não foi possível salvar a foto. Tente novamente.' });
        } finally {
            api.estado.falhar = false;
        }

        assert.equal((await enviar(Buffer.from('imagem interrompida'))).status, 400);
        assert.deepEqual(Buffer.from(await (await lerFoto()).arrayBuffer()), salva);
        assert.equal((await enviar(nova, 'image/jpeg', 99)).status, 401);
        const alteracao = await enviar(nova, 'image/jpeg');

        assert.equal(alteracao.status, 200);
        assert.notEqual((await alteracao.json()).foto_url, referencia);
        assert.equal((await api.banco.query('SELECT count(*)::int AS total FROM usuario_foto')).rows[0].total, 1);
    });

    await t.test('remover a foto restaura a referência nula e preserva o perfil e suas preferências', async () => {
        assert.equal((await api.request('/perfil/foto', 'DELETE')).status, 204);
        assert.equal((await lerFoto()).status, 404);
        const perfil = (await (await api.request('/perfil')).json()).usuario;

        assert.equal(perfil.foto_url, null);
        assert.equal(perfil.nome, 'Novo nome');
        assert.equal(perfil.st_notificacao, false);
        assert.equal((await api.request('/perfil/foto', 'DELETE', undefined, 99)).status, 401);
    });
});
