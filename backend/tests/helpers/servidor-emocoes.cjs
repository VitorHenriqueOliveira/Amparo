const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const jwt = require('jsonwebtoken');
const { PGlite } = require('@electric-sql/pglite');

// Usa as migrações versionadas e um PostgreSQL em memória, sem acessar o banco real.
async function criarAmbienteEmocoes() {
    const banco = new PGlite();
    const { lerMigracoes } = await import('../../scripts/sql-migrations.js');

    for (const migracao of (await lerMigracoes()).slice(0, 4)) {
        await banco.transaction(async (tx) => {
            for (const comando of migracao.comandos) await tx.exec(comando);
        });
    }

    await banco.exec(`INSERT INTO usuario (id_usuario, nome, email, senha) VALUES
        (7, 'Conta de teste', 'emocao@example.com', 'hash-simulado'),
        (8, 'Outra conta', 'outra@example.com', 'hash-simulado')`);

    const estado = { falhar: false, consultas: [] };
    const sql = async (partes, ...valores) => {
        if (estado.falhar) throw new Error('Detalhe privado do banco de teste');
        const query = partes.reduce((texto, parte, indice) => texto + (indice ? '$' + indice : '') + parte, '');
        estado.consultas.push({ query, valores });
        return (await banco.query(query, valores)).rows;
    };
    const segredo = 'chave-exclusiva-dos-testes-de-emocoes';
    const contexto = vm.createContext({ console, Buffer, URL, process: { env: { JWT_SECRET: segredo } } });
    const externos = {
        express: { default: require('express') },
        cors: { default: require('cors') },
        helmet: { default: require('helmet') },
        'express-rate-limit': { rateLimit: require('express-rate-limit').rateLimit },
        jsonwebtoken: { default: jwt },
        bcrypt: { default: require('bcrypt') },
        'node:crypto': { createHash: require('node:crypto').createHash },
        '../db.js': { default: sql },
    };
    const modulos = new Map();

    async function carregar(arquivo) {
        if (modulos.has(arquivo)) return modulos.get(arquivo);
        const modulo = new vm.SourceTextModule(fs.readFileSync(arquivo, 'utf8'), { context: contexto, identifier: arquivo });
        modulos.set(arquivo, modulo);
        await modulo.link((specifier, referencia) => {
            if (!(specifier in externos)) return carregar(path.resolve(path.dirname(referencia.identifier), specifier));
            const valores = externos[specifier];
            return new vm.SyntheticModule(Object.keys(valores), function () {
                for (const [chave, valor] of Object.entries(valores)) this.setExport(chave, valor);
            }, { context: contexto });
        });
        return modulo;
    }

    const modulo = await carregar(path.resolve(__dirname, '../../src/app.js'));
    await modulo.evaluate();
    const servidor = modulo.namespace.criarApp({ origensPermitidas: [] }).listen(0, '127.0.0.1');
    await new Promise((resolve) => servidor.once('listening', resolve));
    const base = 'http://127.0.0.1:' + servidor.address().port + '/api';

    return {
        banco, estado,
        request(rota, method = 'GET', body, id = 7) {
            const token = id ? jwt.sign({ id_usuario: id }, segredo, {
                algorithm: 'HS256', issuer: 'amparo-api', audience: 'amparo-app', expiresIn: '1h',
            }) : null;
            return fetch(base + rota, {
                method,
                headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
                ...(body === undefined ? {} : { body: JSON.stringify(body) }),
            });
        },
        async encerrar() {
            await new Promise((resolve) => servidor.close(resolve));
            await banco.close();
        },
    };
}

module.exports = { criarAmbienteEmocoes };
