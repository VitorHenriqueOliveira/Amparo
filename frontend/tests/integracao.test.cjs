const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

async function carregar(arquivo, imports) {
  const contexto = vm.createContext({ Date, Math, console });
  const modulo = new vm.SourceTextModule(fs.readFileSync(path.join(__dirname, '..', arquivo), 'utf8'), { context: contexto });
  await modulo.link((specifier) => {
    assert.ok(specifier in imports, 'Dependência inesperada: ' + specifier);
    return new vm.SyntheticModule(['default'], function () { this.setExport('default', imports[specifier]); }, { context: contexto });
  });
  await modulo.evaluate();
  return modulo.namespace;
}

function storageMock(inicial = []) {
  const dados = new Map(inicial);
  return {
    dados,
    async getItem(k) { return dados.get(k) ?? null; },
    async setItem(k, v) { dados.set(k, v); },
    async multiGet(keys) { return keys.map(k => [k, dados.get(k) ?? null]); },
    async multiSet(entries) { entries.forEach(([k, v]) => dados.set(k, v)); },
    async multiRemove(keys) { keys.forEach(k => dados.delete(k)); },
  };
}

const usuario = { id_usuario: 7, nome: 'Pessoa de teste', email: 'teste@example.com' };

test('sessão persiste usuário e JWT, restaura e remove autenticação no logout', async () => {
  const storage = storageMock();
  const api = { defaults: { headers: { common: {} } } };
  const sessao = await carregar('src/services/sessao.js', { '@react-native-async-storage/async-storage': storage, './api': api });
  await sessao.iniciarSessao(usuario, 'jwt-de-teste');
  assert.equal(api.defaults.headers.common.Authorization, 'Bearer jwt-de-teste');
  delete api.defaults.headers.common.Authorization;
  assert.equal((await sessao.restaurarSessao()).id_usuario, 7);
  assert.equal(api.defaults.headers.common.Authorization, 'Bearer jwt-de-teste');
  await sessao.encerrarSessao();
  assert.equal(storage.dados.size, 0);
  assert.equal(api.defaults.headers.common.Authorization, undefined);
  assert.equal(await sessao.restaurarSessao(), null);
});

test('sessão corrompida ou incompleta volta ao login e limpa credenciais', async () => {
  for (const valor of ['{json inválido', JSON.stringify({ nome: 'Sem ID' }), JSON.stringify(usuario)]) {
    const storage = storageMock([['@Amparo:usuario', valor]]);
    if (valor !== JSON.stringify(usuario)) storage.dados.set('@Amparo:token', 'token');
    const api = { defaults: { headers: { common: { Authorization: 'token antigo' } } } };
    const sessao = await carregar('src/services/sessao.js', { '@react-native-async-storage/async-storage': storage, './api': api });
    assert.equal(await sessao.restaurarSessao(), null);
    assert.equal(storage.dados.size, 0);
    assert.equal(api.defaults.headers.common.Authorization, undefined);
  }
});

test('falha ao persistir e resposta inválida não ativam uma sessão', async () => {
  const storage = storageMock();
  storage.multiSet = async () => { throw new Error('Armazenamento indisponível'); };
  const api = { defaults: { headers: { common: {} } } };
  const sessao = await carregar('src/services/sessao.js', { '@react-native-async-storage/async-storage': storage, './api': api });
  await assert.rejects(sessao.iniciarSessao(usuario, 'token'), /indisponível/);
  await assert.rejects(sessao.iniciarSessao({}, ''), /inválida/);
  assert.equal(api.defaults.headers.common.Authorization, undefined);
});

test('emoções e sono ficam separados ao trocar de conta', async () => {
  const storage = storageMock([['@amparo/emocoes', JSON.stringify([{ emotionKey: 'triste' }])]]);
  const registros = await carregar('src/storage/registros.js', { '@react-native-async-storage/async-storage': storage });
  await registros.adicionarEmocao(7, 'feliz', 'Feliz');
  await registros.registrarSonoHoje(7, '22:30', '06:30');
  assert.equal((await registros.listarEmocoes(7))[0].emotionKey, 'feliz');
  assert.equal((await registros.listarSono(7))[0].totalMinutes, 480);
  assert.equal((await registros.listarEmocoes(8)).length, 0);
  assert.equal((await registros.listarSono(8)).length, 0);
  assert.ok(storage.dados.has('@amparo/emocoes'), 'O histórico antigo não deve ser apagado nem atribuído a outra conta.');
});

test('editar sono substitui o dia atual, calcula passagem da meia-noite e rejeita horários inválidos', async () => {
  const storage = storageMock();
  const registros = await carregar('src/storage/registros.js', { '@react-native-async-storage/async-storage': storage });
  const primeiro = await registros.registrarSonoHoje(7, '23:45', '07:15');
  assert.equal(primeiro.totalMinutes, 450);
  await registros.registrarSonoHoje(7, '22:00', '07:00');
  const itens = await registros.listarSono(7);
  assert.equal(itens.length, 1);
  assert.equal(itens[0].id, primeiro.id);
  assert.equal(itens[0].totalMinutes, 540);
  await assert.rejects(registros.registrarSonoHoje(7, '25:00', '07:00'), /inválido/);
  await assert.rejects(registros.listarEmocoes(undefined), /inválido/);
});

test('diário converte o contrato da API para as telas e envia CRUD para as rotas existentes', async () => {
  const chamadas = [];
  const nota = { id_diario: 42, descricao: 'Meu dia', data_registro: '2026-10-14' };
  const api = {
    async get(...args) { chamadas.push(['get', ...args]); return { data: [nota] }; },
    async post(...args) { chamadas.push(['post', ...args]); return { data: nota }; },
    async put(...args) { chamadas.push(['put', ...args]); return { data: { ...nota, descricao: 'Editado' } }; },
    async delete(...args) { chamadas.push(['delete', ...args]); },
  };
  const diario = await carregar('src/services/diario.js', { './api': api });
  const notas = await diario.listarDiario(7);
  assert.equal(notas[0].id, 42);
  assert.equal(notas[0].text, 'Meu dia');
  assert.equal(notas[0].date, '14/10/2026');
  assert.equal(notas[0].createdAt, '2026-10-14');
  await diario.criarNota(7, 'Meu dia');
  assert.equal((await diario.atualizarNota(42, 'Editado')).text, 'Editado');
  await diario.excluirNota(42);
  assert.deepEqual(JSON.parse(JSON.stringify(chamadas)), [
    ['get', '/diario/7'], ['post', '/diario', { id_usuario: 7, descricao: 'Meu dia' }],
    ['put', '/diario/42', { descricao: 'Editado' }], ['delete', '/diario/42'],
  ]);
});

test('falha da API do diário é propagada sem cair em persistência local', async () => {
  const api = { get: async () => { throw new Error('API indisponível'); } };
  const diario = await carregar('src/services/diario.js', { './api': api });
  await assert.rejects(diario.listarDiario(7), /indisponível/);
});
