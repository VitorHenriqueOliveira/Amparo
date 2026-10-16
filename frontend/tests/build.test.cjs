const assert = require('node:assert/strict');
const { test } = require('node:test');
const { validarEnderecoApi } = require('../scripts/validar-build.cjs');

test('build aceita domínio HTTPS da API hospedada', () => {
    assert.doesNotThrow(() => validarEnderecoApi('https://amparo-api.example.com/api'));
});

test('build impede API ausente, local, sem HTTPS ou com credenciais incorporadas', () => {
    for (const endereco of [
        undefined,
        '',
        'endereco-invalido',
        'http://amparo-api.example.com/api',
        'https://localhost/api',
        'https://api.localhost/api',
        'https://computador.local/api',
        'https://127.0.0.1/api',
        'https://192.168.0.10/api',
        'https://[::1]/api',
        'https://usuario:senha@amparo-api.example.com/api',
        'https://amparo-api.example.com/api?token=segredo',
        'https://amparo-api.example.com/api#segredo',
    ]) {
        assert.throws(() => validarEnderecoApi(endereco));
    }
});
