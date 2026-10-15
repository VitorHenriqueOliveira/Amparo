const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const jwt = require('jsonwebtoken');
const { PGlite } = require('@electric-sql/pglite');

async function criarAmbienteSono(porta = 0) {
    const banco = new PGlite();
    await banco.exec(
        "CREATE TABLE usuario (id_usuario SERIAL PRIMARY KEY, nome TEXT NOT NULL, email TEXT UNIQUE NOT NULL," +
        "senha TEXT NOT NULL, data_registro TIMESTAMPTZ NOT NULL DEFAULT now());" +
        "CREATE TABLE diario (id_diario SERIAL PRIMARY KEY, id_usuario INTEGER NOT NULL REFERENCES usuario," +
        "descricao TEXT NOT NULL, data_registro TIMESTAMPTZ NOT NULL DEFAULT now());"
    );
    for (const nome of ['002_calma_historico.sql', '003_registro_emocional.sql',
        '005_integridade_registro_emocional.sql', '006_registro_sono.sql']) {
        await banco.exec(fs.readFileSync(path.join(__dirname, '../../migrations', nome), 'utf8'));
    }
    const hash = await require('bcrypt').hash('teste1234', 10);
    await banco.query("INSERT INTO usuario (id_usuario, nome, email, senha) VALUES (7, 'Pessoa de teste', 'sono@example.com', $1), (8, 'Outra conta', 'outra@example.com', $1)", [hash]);
    const estado = { falhar: false, consultas: [] };
    const sql = async (partes, ...valores) => {
        if (estado.falhar) throw new Error('Erro interno privado de teste');
        const query = partes.reduce((texto, parte, indice) => texto + (indice ? '$' + indice : '') + parte, '');
        estado.consultas.push({ query, valores });
        return (await banco.query(query, valores)).rows;
    };
    const segredo = 'segredo-isolado-apenas-para-validacao-de-sono';
    const contexto = vm.createContext({ console, Buffer, URL, process: { env: { JWT_SECRET: segredo } } });
    const externos = {
        express: { default: require('express') },
        cors: { default: require('cors') },
        helmet: { default: require('helmet') },
        'express-rate-limit': { rateLimit: require('express-rate-limit').rateLimit },
        jsonwebtoken: { default: jwt },
        bcrypt: { default: require('bcrypt') },
        '../db.js': { default: sql },
    };
    const modulos = new Map();
    async function carregar(arquivo) {
        if (modulos.has(arquivo)) return modulos.get(arquivo);
        const modulo = new vm.SourceTextModule(fs.readFileSync(arquivo, 'utf8'), { context: contexto, identifier: arquivo });
        modulos.set(arquivo, modulo);
        await modulo.link((specifier, referencia) => {
            if (!(specifier in externos)) return carregar(path.resolve(path.dirname(referencia.identifier), specifier));
            const namespace = externos[specifier];
            return new vm.SyntheticModule(Object.keys(namespace), function () {
                for (const [chave, valor] of Object.entries(namespace)) this.setExport(chave, valor);
            }, { context: contexto });
        });
        return modulo;
    }
    const modulo = await carregar(path.resolve(__dirname, '../../src/app.js'));
    await modulo.evaluate();
    const app = modulo.namespace.criarApp({ origensPermitidas: ['http://127.0.0.1:8083', 'http://localhost:8083'] });
    const servidor = app.listen(porta, '127.0.0.1');
    await new Promise((resolve) => servidor.once('listening', resolve));
    const base = 'http://127.0.0.1:' + servidor.address().port + '/api';
    const token = (id) => jwt.sign({ id_usuario: id }, segredo, {
        algorithm: 'HS256', issuer: 'amparo-api', audience: 'amparo-app', expiresIn: '1h',
    });
    return {
        banco, estado, base,
        request(rota, method = 'GET', body, id = 7) {
            return fetch(base + rota, {
                method, headers: { 'Content-Type': 'application/json', ...(id ? { Authorization: 'Bearer ' + token(id) } : {}) },
                ...(body === undefined ? {} : { body: JSON.stringify(body) }),
            });
        },
        async encerrar() {
            await new Promise((resolve) => servidor.close(resolve));
            await banco.close();
        },
    };
}

module.exports = { criarAmbienteSono };
