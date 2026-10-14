const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

test('rotas de diário mantêm JWT, CRUD e isolamento por usuário', async (t) => {
  const contexto = vm.createContext({ process, console });
  const modulos = new Map();
  const consultas = [];
  let resultado = [];
  const sql = async (strings, ...valores) => {
    consultas.push({ query: strings.join('?'), valores });
    return resultado;
  };
  const externos = { express, jsonwebtoken: jwt, bcrypt };
  async function carregar(arquivo) {
    if (modulos.has(arquivo)) return modulos.get(arquivo);
    const m = new vm.SourceTextModule(fs.readFileSync(arquivo, 'utf8'), { context: contexto, identifier: arquivo });
    modulos.set(arquivo, m);
    await m.link(async (specifier, referencia) => {
      if (specifier in externos || specifier === '../db.js') {
        const valor = specifier === '../db.js' ? sql : externos[specifier];
        return new vm.SyntheticModule(['default'], function () { this.setExport('default', valor); }, { context: contexto });
      }
      return carregar(path.resolve(path.dirname(referencia.identifier), specifier));
    });
    return m;
  }
  const diario = await carregar(path.resolve(__dirname, '../src/routes/diario.js'));
  const usuario = await carregar(path.resolve(__dirname, '../src/routes/usuario.js'));
  await diario.evaluate();
  await usuario.evaluate();
  const original = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'segredo-apenas-para-teste-local';
  t.after(() => { if (original === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = original; });
  const app = express();
  app.use(express.json());
  app.use('/api', usuario.namespace.default);
  app.use('/api', diario.namespace.default);
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = 'http://127.0.0.1:' + server.address().port + '/api';
  const token = jwt.sign({ id_usuario: 7 }, process.env.JWT_SECRET, { expiresIn: '1m' });
  const request = (url, method = 'GET', body, authenticated = true) => fetch(base + url, {
    method,
    headers: { 'Content-Type': 'application/json', ...(authenticated ? { Authorization: 'Bearer ' + token } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

  await t.test('sem token retorna 401, sem consultar o banco', async () => {
    consultas.length = 0;
    assert.equal((await request('/diario/7', 'GET', undefined, false)).status, 401);
    assert.equal(consultas.length, 0);
  });
  await t.test('login desconhecido retorna 401 e encerra a resposta', async () => {
    resultado = [];
    assert.equal((await request('/login', 'POST', { email: 'ausente@example.com', senha: 'teste' }, false)).status, 401);
  });
  await t.test('listar outro usuário ou forjar dono no POST retorna 403', async () => {
    consultas.length = 0;
    assert.equal((await request('/diario/8')).status, 403);
    assert.equal((await request('/diario', 'POST', { id_usuario: 8, descricao: 'texto' })).status, 403);
    assert.equal(consultas.length, 0);
  });
  await t.test('campos vazios e IDs parcialmente numéricos retornam 400', async () => {
    consultas.length = 0;
    assert.equal((await request('/diario/7abc')).status, 400);
    assert.equal((await request('/diario', 'POST', { descricao: '  ' })).status, 400);
    assert.equal((await request('/diario/42', 'PUT', { descricao: '' })).status, 400);
    assert.equal((await request('/diario/42abc', 'DELETE')).status, 400);
    assert.equal(consultas.length, 0);
  });
  await t.test('CRUD usa o usuário autenticado nas consultas parametrizadas', async () => {
    resultado = [{ id_diario: 42, descricao: 'Texto', data_registro: '2026-10-14' }];
    let res = await request('/diario/7');
    assert.equal(res.status, 200);
    assert.equal((await res.json())[0].id_diario, 42);
    assert.deepEqual(consultas.at(-1).valores, [7]);
    res = await request('/diario', 'POST', { id_usuario: 7, descricao: ' Texto ' });
    assert.equal(res.status, 201);
    assert.deepEqual(consultas.at(-1).valores, [7, 'Texto']);
    assert.equal((await request('/diario/42', 'PUT', { descricao: ' Editado ' })).status, 200);
    assert.deepEqual(consultas.at(-1).valores, ['Editado', 42, 7]);
    assert.match(consultas.at(-1).query, /AND id_usuario/);
    assert.equal((await request('/diario/42', 'DELETE')).status, 200);
    assert.deepEqual(consultas.at(-1).valores, [42, 7]);
    assert.match(consultas.at(-1).query, /AND id_usuario/);
  });
  await t.test('nota ausente ou de outra conta não pode ser editada ou excluída', async () => {
    resultado = [];
    assert.equal((await request('/diario/42', 'PUT', { descricao: 'texto' })).status, 404);
    assert.equal((await request('/diario/42', 'DELETE')).status, 404);
  });
});
