const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { PGlite } = require('@electric-sql/pglite');

async function criarBanco(t) {
    const banco = new PGlite();
    t.after(() => banco.close());
    await banco.exec(`CREATE TABLE usuario (id_usuario SERIAL PRIMARY KEY);
        INSERT INTO usuario DEFAULT VALUES;
        INSERT INTO usuario DEFAULT VALUES;`);

    return banco;
}

async function migrar(banco, nome) {
    const texto = fs.readFileSync(path.join(__dirname, '../migrations', nome), 'utf8');
    await banco.exec(texto);
}

test('migrações emocionais criam catálogo, vínculos, timestamp com fuso e hora derivada', async (t) => {
    const banco = await criarBanco(t);
    await migrar(banco, '003_registro_emocional.sql');
    await migrar(banco, '005_integridade_registro_emocional.sql');
    const colunas = (await banco.query(`SELECT column_name, data_type, is_generated
        FROM information_schema.columns WHERE table_name = 'registro_emocional'`)).rows;
    assert.equal(colunas.find((item) => item.column_name === 'data_registro').data_type, 'timestamp with time zone');
    assert.equal(colunas.find((item) => item.column_name === 'hora_registro').is_generated, 'ALWAYS');
    assert.equal(colunas.find((item) => item.column_name === 'id_cliente').data_type, 'uuid');
    assert.deepEqual((await banco.query('SELECT id_emocao FROM emocao ORDER BY id_emocao')).rows.map((item) => item.id_emocao), ['Feliz', 'Neutro', 'Raiva', 'Triste']);
    await banco.exec("INSERT INTO registro_emocional (id_usuario, id_emocao) VALUES (1, 'Feliz');");
    assert.equal((await banco.query(`SELECT abs(extract(epoch FROM (data_registro - statement_timestamp()))) < 5 AS recente,
        hora_registro = (data_registro AT TIME ZONE 'UTC')::time AS mesma_hora FROM registro_emocional`)).rows[0].recente, true);
    assert.equal((await banco.query(`SELECT hora_registro = (data_registro AT TIME ZONE 'UTC')::time AS mesma_hora FROM registro_emocional`)).rows[0].mesma_hora, true);
});

test('atualiza a chave legada sem perder ID, descrição, instante ou microssegundos', async (t) => {
    const banco = await criarBanco(t);
    await banco.exec(`CREATE TABLE emocao (id_emocao VARCHAR(50) PRIMARY KEY, descricao TEXT);
        INSERT INTO emocao VALUES ('Feliz', 'Descrição preservada');
        CREATE TABLE registro_emocional (
            id_registro_emocional SERIAL PRIMARY KEY,
            id_usuario INTEGER NOT NULL REFERENCES usuario,
            id_emocao VARCHAR(50) NOT NULL REFERENCES emocao,
            data_registro TIMESTAMP NOT NULL DEFAULT now()
        );
        INSERT INTO registro_emocional (id_usuario, id_emocao, data_registro)
            VALUES (1, 'Feliz', '2026-10-14 02:30:00.123456');
        SET TIME ZONE 'Asia/Tokyo';`);
    await migrar(banco, '003_registro_emocional.sql');
    await migrar(banco, '005_integridade_registro_emocional.sql');
    await migrar(banco, '005_integridade_registro_emocional.sql');
    const [registro] = (await banco.query(`SELECT id_registro_emocao, id_cliente, hora_registro::text AS hora,
        data_registro = TIMESTAMPTZ '2026-10-14T02:30:00.123456Z' AS preservado
        FROM registro_emocional`)).rows;
    assert.equal(registro.id_registro_emocao, 1);
    assert.equal(registro.id_cliente, null);
    assert.equal(registro.hora, '02:30:00.123456');
    assert.equal(registro.preservado, true);
    assert.equal((await banco.query("SELECT descricao FROM emocao WHERE id_emocao = 'Feliz'")).rows[0].descricao, 'Descrição preservada');
});

test('reenvio não duplica e confirmações distintas continuam permitidas no mesmo dia', async (t) => {
    const banco = await criarBanco(t);
    await migrar(banco, '003_registro_emocional.sql');
    await migrar(banco, '005_integridade_registro_emocional.sql');
    const query = `INSERT INTO registro_emocional (id_usuario, id_emocao, id_cliente)
        VALUES ($1, 'Feliz', $2) ON CONFLICT (id_usuario, id_cliente) DO NOTHING`;
    const id = 'c0b91490-11f5-4696-8bfd-968e21b87bba';
    await banco.query(query, [1, id]);
    await banco.query(query, [1, id]);
    await banco.query(query, [2, id]);
    await banco.query(query, [1, 'c0b91490-11f5-4696-8bfd-968e21b87bbb']);
    assert.equal((await banco.query('SELECT count(*)::int AS total FROM registro_emocional WHERE id_usuario = 1')).rows[0].total, 2);
    assert.equal((await banco.query('SELECT count(*)::int AS total FROM registro_emocional WHERE id_usuario = 2')).rows[0].total, 1);
});

test('banco rejeita referências inválidas, hora forjada e catálogo vazio', async (t) => {
    const banco = await criarBanco(t);
    await migrar(banco, '003_registro_emocional.sql');
    await migrar(banco, '005_integridade_registro_emocional.sql');
    for (const [query, codigo] of [
        ["INSERT INTO registro_emocional (id_usuario, id_emocao) VALUES (99, 'Feliz')", '23503'],
        ["INSERT INTO registro_emocional (id_usuario, id_emocao) VALUES (1, 'Inexistente')", '23503'],
        ["INSERT INTO registro_emocional (id_usuario, id_emocao, hora_registro) VALUES (1, 'Feliz', '12:00')", '428C9'],
        ["UPDATE emocao SET descricao = '' WHERE id_emocao = 'Feliz'", '23514'],
        ["UPDATE emocao SET descricao = NULL WHERE id_emocao = 'Feliz'", '23502'],
    ]) {
        await assert.rejects(banco.exec(query), (error) => error.code === codigo);
    }
});
