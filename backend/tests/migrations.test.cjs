const test = require('node:test');
const assert = require('node:assert/strict');
const { PGlite } = require('@electric-sql/pglite');

async function preparar(t, limite = 4) {
    const banco = new PGlite();
    t.after(() => banco.close());
    const { lerMigracoes } = await import('../scripts/sql-migrations.js');
    const migracoes = await lerMigracoes();

    for (const migracao of migracoes.slice(0, limite)) {
        await banco.transaction(async (tx) => {
            for (const comando of migracao.comandos) await tx.exec(comando);
        });
    }

    return { banco, migracoes };
}

test('um banco vazio recebe as seis tabelas com integridade e timestamps explícitos', async (t) => {
    const { banco } = await preparar(t);
    const colunas = (await banco.query(`SELECT table_name, column_name, data_type, is_generated
        FROM information_schema.columns WHERE table_schema = 'public'`)).rows;

    for (const [tabela, coluna] of [['usuario', 'data_cadastro'], ['diario', 'data_registro'], ['registro_emocional', 'data_registro'], ['calma_historico', 'concluido_em'], ['calma_historico', 'recebido_em']]) {
        assert.equal(colunas.find((item) => item.table_name === tabela && item.column_name === coluna).data_type, 'timestamp with time zone');
    }

    assert.equal(colunas.find((item) => item.table_name === 'registro_emocional' && item.column_name === 'hora_registro').is_generated, 'ALWAYS');
    assert.equal(colunas.find((item) => item.table_name === 'sono' && item.column_name === 'data_registro').data_type, 'date');
    assert.equal((await banco.query('SELECT count(*)::int AS total FROM emocao')).rows[0].total, 4);
    const email = 'exemplo@example.com';
    await banco.query('INSERT INTO usuario (nome, email, senha) VALUES ($1, $2, $3)', ['Exemplo', email, 'hash-simulado']);

    const invalidos = [
        ["INSERT INTO usuario (nome, email, senha) VALUES (' ', 'outro@example.com', 'hash')", '23514'],
        ["INSERT INTO usuario (nome, email, senha) VALUES ('Outro', ' EXEMPLO@EXAMPLE.COM ', 'hash')", '23505'],
        ["UPDATE usuario SET meta_sono_horas_min = 9, meta_sono_horas_max = 7", '23514'],
        ["UPDATE usuario SET data_cadastro = 'infinity'", '23514'],
        ["INSERT INTO diario (id_usuario, descricao) VALUES (1, NULL)", '23502'],
        ["INSERT INTO diario (id_usuario, descricao) VALUES (1, ' ')", '23514'],
        ["INSERT INTO diario (id_usuario, descricao) VALUES (1, repeat('x', 10001))", '23514'],
        ["UPDATE emocao SET descricao = '' WHERE id_emocao = 'Feliz'", '23514'],
        ["INSERT INTO registro_emocional (id_usuario, id_emocao) VALUES (99, 'Feliz')", '23503'],
        ["INSERT INTO registro_emocional (id_usuario, id_emocao) VALUES (1, 'Inexistente')", '23503'],
        ["INSERT INTO sono (id_usuario, hora_dormiu, hora_acordou, data_registro) VALUES (1, '07:00', '07:00', '2026-10-14')", '23514'],
        ["INSERT INTO sono (id_usuario, hora_dormiu, hora_acordou, data_registro) VALUES (1, '24:00', '07:00', '2026-10-14')", '23514'],
        ["INSERT INTO calma_historico (id_usuario, id_cliente, concluido_em, duracao_segundos) VALUES (1, 'c0b91490-11f5-4696-8bfd-968e21b87bba', now(), 0)", '23514'],
    ];

    for (const [query, code] of invalidos) await assert.rejects(banco.exec(query), (error) => error.code === code);
});

test('a migração conserva históricos, IDs, microssegundos e instantes mesmo sob outro fuso', async (t) => {
    const { banco, migracoes } = await preparar(t, 3);
    const { criarValidacao, salvarImpressoes, conferirImpressoes } = await import('../scripts/preservar-registros.js');
    await banco.exec(`
        INSERT INTO usuario (nome, email, senha, data_cadastro) VALUES ('Exemplo', 'exemplo@example.com', 'hash', '2025-11-10 02:30:00.123456');
        INSERT INTO diario (id_usuario, descricao, data_registro) VALUES (1, 'Texto preservado', '2025-11-10 02:30:00.123456');
        INSERT INTO registro_emocional (id_usuario, id_emocao, data_registro) VALUES (1, 'Feliz', '2025-11-10 02:30:00.123456');
        INSERT INTO sono (id_usuario, hora_dormiu, hora_acordou, data_registro) VALUES (1, '22:30', '06:30', '2025-11-10');
        INSERT INTO calma_historico (id_usuario, id_cliente, concluido_em, duracao_segundos) VALUES (1, 'c0b91490-11f5-4696-8bfd-968e21b87bba', '2025-11-10T02:30:00Z', 14);
        SET TIME ZONE 'Asia/Tokyo';
    `);

    await banco.transaction(async (tx) => {
        await tx.exec(criarValidacao);
        for (const comando of salvarImpressoes) await tx.exec(comando);
        for (const comando of migracoes[3].comandos) await tx.exec(comando);
        for (const comando of conferirImpressoes) await tx.exec(comando);
    });
    await banco.transaction(async (tx) => {
        for (const comando of migracoes[3].comandos) await tx.exec(comando);
    });

    for (const [tabela, coluna] of [['usuario', 'data_cadastro'], ['diario', 'data_registro'], ['registro_emocional', 'data_registro']]) {
        const [registro] = (await banco.query(`SELECT count(*) OVER ()::int AS total, ${coluna} = TIMESTAMPTZ '2025-11-10 02:30:00.123456+00' AS preservado FROM ${tabela}`)).rows;
        assert.equal(registro.total, 1);
        assert.equal(registro.preservado, true);
    }

    const [registro] = (await banco.query('SELECT id_registro_emocao, hora_registro::text AS hora FROM registro_emocional')).rows;
    assert.equal(registro.id_registro_emocao, 1);
    assert.equal(registro.hora, '02:30:00.123456');
    assert.equal((await banco.query('SELECT descricao FROM diario')).rows[0].descricao, 'Texto preservado');
    assert.equal((await banco.query('SELECT count(*)::int AS total FROM calma_historico')).rows[0].total, 1);
    assert.equal((await banco.query('SELECT data_registro::text AS dia FROM sono')).rows[0].dia, '2025-11-10');
});

test('índices garantem um sono por dia, reenvio sem duplicação e várias emoções intencionais', async (t) => {
    const { banco } = await preparar(t);
    await banco.exec("INSERT INTO usuario (nome, email, senha) VALUES ('Exemplo', 'exemplo@example.com', 'hash');");
    const idCliente = 'c0b91490-11f5-4696-8bfd-968e21b87bba';
    const query = 'INSERT INTO registro_emocional (id_usuario, id_emocao, id_cliente) VALUES (1, $1, $2) ON CONFLICT (id_usuario, id_cliente) DO NOTHING';
    await banco.query(query, ['Feliz', idCliente]);
    await banco.query(query, ['Feliz', idCliente]);
    await banco.exec("INSERT INTO registro_emocional (id_usuario, id_emocao) VALUES (1, 'Feliz'), (1, 'Triste');");
    assert.equal((await banco.query('SELECT count(*)::int AS total FROM registro_emocional')).rows[0].total, 3);
    await banco.exec("INSERT INTO sono (id_usuario, hora_dormiu, hora_acordou, data_registro) VALUES (1, '22:30', '06:30', '2026-10-14');");
    await assert.rejects(banco.exec("INSERT INTO sono (id_usuario, hora_dormiu, hora_acordou, data_registro) VALUES (1, '23:30', '06:30', '2026-10-14');"), (error) => error.code === '23505');
    await assert.rejects(banco.exec("UPDATE registro_emocional SET hora_registro = '12:00'"), (error) => error.code === '428C9');
    const [instante] = (await banco.query(`SELECT (TIMESTAMPTZ '2026-10-14 02:30:00+00' AT TIME ZONE 'America/Sao_Paulo')::date::text AS dia`)).rows;
    assert.equal(instante.dia, '2026-10-13');
});

test('dados legados inválidos abortam a migração inteira sem correção silenciosa', async (t) => {
    const { banco, migracoes } = await preparar(t, 3);
    await banco.exec("INSERT INTO usuario (nome, email, senha) VALUES ('Exemplo', 'exemplo@example.com', 'hash'); INSERT INTO diario (id_usuario, descricao) VALUES (1, NULL);");
    await assert.rejects(banco.transaction(async (tx) => {
        for (const comando of migracoes[3].comandos) await tx.exec(comando);
    }), (error) => error.code === '23502');
    const [coluna] = (await banco.query("SELECT data_type FROM information_schema.columns WHERE table_name = 'usuario' AND column_name = 'data_cadastro'")).rows;
    assert.equal(coluna.data_type, 'timestamp without time zone');
    assert.equal((await banco.query('SELECT descricao FROM diario')).rows[0].descricao, null);
});

test('a cadeia completa atualiza a chave antiga sem perder os registros', async (t) => {
    const { banco, migracoes } = await preparar(t, 2);
    await banco.exec(`
        CREATE TABLE emocao (id_emocao VARCHAR(50) PRIMARY KEY, descricao TEXT);
        INSERT INTO emocao VALUES ('Feliz', 'Descrição original');
        INSERT INTO usuario (nome, email, senha) VALUES ('Exemplo', 'exemplo@example.com', 'hash');
        CREATE TABLE registro_emocional (
            id_registro_emocional SERIAL PRIMARY KEY, id_usuario INTEGER NOT NULL REFERENCES usuario,
            id_emocao VARCHAR(50) NOT NULL REFERENCES emocao,
            data_registro TIMESTAMP NOT NULL DEFAULT now()
        );
        INSERT INTO registro_emocional (id_usuario, id_emocao, data_registro) VALUES (1, 'Feliz', '2026-10-14 02:30:00.123456');
    `);
    const { criarValidacao, salvarImpressoes, conferirImpressoes } = await import('../scripts/preservar-registros.js');
    await banco.transaction(async (tx) => {
        await tx.exec(criarValidacao);
        for (const comando of salvarImpressoes) await tx.exec(comando);
        for (const migracao of migracoes.slice(2)) {
            for (const comando of migracao.comandos) await tx.exec(comando);
        }
        for (const comando of conferirImpressoes) await tx.exec(comando);
    });
    assert.equal((await banco.query('SELECT id_registro_emocao FROM registro_emocional')).rows[0].id_registro_emocao, 1);
    assert.equal((await banco.query("SELECT descricao FROM emocao WHERE id_emocao = 'Feliz'")).rows[0].descricao, 'Descrição original');
});
