const test = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { PGlite } = require('@electric-sql/pglite');

test('migrações de notificações e foto preservam contas, preferências, históricos e as próprias integrações', async (t) => {
    const banco = new PGlite();
    t.after(() => banco.close());
    const { lerMigracoes } = await import('../scripts/sql-migrations.js');
    const { criarValidacao, salvarImpressoes, conferirImpressoes } = await import('../scripts/preservar-registros.js');
    const migracoes = await lerMigracoes();

    async function aplicar(lista, preservar = false) {
        await banco.transaction(async (tx) => {
            if (preservar) {
                await tx.exec(criarValidacao);
                for (const comando of salvarImpressoes) await tx.exec(comando);
            }

            for (const migracao of lista) {
                for (const comando of migracao.comandos) await tx.exec(comando);
            }

            if (preservar) {
                for (const comando of conferirImpressoes) await tx.exec(comando);
            }
        });
    }

    await aplicar(migracoes.slice(0, 8));
    await banco.exec(`
        INSERT INTO usuario (id_usuario, nome, email, senha, st_notificacao)
            VALUES (7, 'Conta preservada', 'teste@example.com', 'hash-preservado', FALSE);
        INSERT INTO diario (id_usuario, descricao) VALUES (7, 'Anotação preservada');
    `);
    const antes = (await banco.query('SELECT to_jsonb(u) AS conta FROM usuario u')).rows;

    await aplicar(migracoes.slice(8), true);
    assert.deepEqual((await banco.query('SELECT to_jsonb(u) AS conta FROM usuario u')).rows, antes);
    assert.equal((await banco.query('SELECT descricao FROM diario')).rows[0].descricao, 'Anotação preservada');

    const instalacao = randomUUID();
    await banco.query(`INSERT INTO notificacao_dispositivo (id_instalacao, id_usuario, expo_token, permissao, versao)
        VALUES ($1, 7, 'ExpoPushToken[token-de-teste-12345]', TRUE, $2)`, [instalacao, randomUUID()]);
    const [lembrete] = (await banco.query(`INSERT INTO notificacao_lembrete (id_usuario, tipo, horario, fuso_horario)
        VALUES (7, 'diario', '09:00', 'America/Sao_Paulo') RETURNING id_lembrete`)).rows;
    await banco.query(`INSERT INTO notificacao_envio (id_lembrete, id_instalacao, versao_dispositivo, dia_local)
        SELECT $1, id_instalacao, versao, '2026-10-23' FROM notificacao_dispositivo`, [lembrete.id_lembrete]);
    await banco.query(`INSERT INTO usuario_foto (id_usuario, conteudo, largura, altura, versao)
        VALUES (7, decode('010203', 'hex'), 10, 10, $1)`, ['a'.repeat(64)]);

    await aplicar(migracoes.slice(8), true);

    for (const tabela of ['notificacao_dispositivo', 'notificacao_lembrete', 'notificacao_envio', 'usuario_foto']) {
        assert.equal((await banco.query('SELECT count(*)::int AS total FROM ' + tabela)).rows[0].total, 1);
    }

    const invalidos = [
        ["INSERT INTO notificacao_dispositivo (id_instalacao, id_usuario, expo_token, permissao, versao) VALUES ('00000000-0000-4000-8000-000000000001', 7, 'ExpoPushToken[token-de-teste-12345]', TRUE, '00000000-0000-4000-8000-000000000002')", '23505'],
        ["UPDATE notificacao_lembrete SET id_usuario = 99", '23503'],
        ["UPDATE notificacao_lembrete SET tipo = 'privado'", '23514'],
        ["UPDATE notificacao_lembrete SET horario = '24:00'", '23514'],
        ["UPDATE notificacao_lembrete SET horario = '09:00:01'", '23514'],
        ["UPDATE usuario_foto SET largura = 513", '23514'],
        ["UPDATE usuario_foto SET tipo_mime = 'image/svg+xml'", '23514'],
        ["UPDATE usuario_foto SET conteudo = decode(repeat('00', 524289), 'hex')", '23514'],
        ["UPDATE usuario_foto SET versao = 'forjada'", '23514'],
        ["UPDATE notificacao_envio SET tentativas = 4", '23514'],
    ];

    for (const [query, code] of invalidos) await assert.rejects(banco.exec(query), (error) => error.code === code);
    await assert.rejects(banco.query(`INSERT INTO notificacao_envio (id_lembrete, id_instalacao, versao_dispositivo, dia_local)
        SELECT id_lembrete, id_instalacao, versao_dispositivo, dia_local FROM notificacao_envio`), (error) => error.code === '23505');
});
