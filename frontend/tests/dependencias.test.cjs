const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const { execFileSync } = require('node:child_process');
const { getAssetSize } = require('metro/private/Assets');
const xcode = require('xcode');

const raiz = path.join(__dirname, '..');
const requireDoXcode = createRequire(require.resolve('xcode'));

// Preserva a leitura de imagens usada pelo Metro após atualizar as dependências.
test('Metro lê as dimensões dos PNGs do projeto', () => {
    const pasta = path.join(raiz, 'assets', 'images');
    const imagens = fs.readdirSync(pasta).filter((nome) => nome.endsWith('.png'));

    assert.ok(imagens.length > 0);

    for (const nome of imagens) {
        const caminho = path.join(pasta, nome);
        const conteudo = fs.readFileSync(caminho);

        assert.deepEqual(getAssetSize('png', conteudo, caminho), {
            width: conteudo.readUInt32BE(16),
            height: conteudo.readUInt32BE(20),
        }, nome);
    }
});

test('Xcode continua gerando identificadores válidos para o projeto iOS', () => {
    const projeto = xcode.project('compatibilidade.pbxproj');
    const identificadores = new Set();

    projeto.hash = { project: { objects: {} } };

    for (let indice = 0; indice < 256; indice++) {
        const identificador = projeto.generateUuid();

        assert.match(identificador, /^[A-F0-9]{24}$/);
        assert.ok(!identificadores.has(identificador));
        identificadores.add(identificador);
    }
});

test('UUID rejeita escrita fora dos limites do buffer', () => {
    const { v5 } = requireDoXcode('uuid');

    assert.throws(() => {
        v5('teste', v5.DNS, new Uint8Array(8), 4);
    }, RangeError);
});

function caixa(tipo, conteudo, tamanho = conteudo.length + 8) {
    const resultado = Buffer.alloc(conteudo.length + 8);

    resultado.writeUInt32BE(tamanho, 0);
    resultado.write(tipo, 4, 'ascii');
    conteudo.copy(resultado, 8);

    return resultado;
}

const imagensMalformadas = {
    ICNS: Buffer.from('69636e73000000106963303700000000', 'hex'),
    JXL: Buffer.concat([
        caixa('JXL ', Buffer.from([13, 10, 135, 10])),
        caixa('ftyp', Buffer.from('jxl \0\0\0\0jxl ')),
        caixa('jxlp', Buffer.alloc(4), 0),
    ]),
    HEIF: Buffer.concat([
        caixa('ftyp', Buffer.from('heic\0\0\0\0heic')),
        caixa('meta', Buffer.concat([
            Buffer.alloc(4),
            caixa('iprp', caixa('ipco', caixa('ispe', Buffer.alloc(12), 0))),
        ])),
    ]),
};

// Isola os parsers para que uma regressão de loop infinito não trave os testes.
for (const [formato, imagem] of Object.entries(imagensMalformadas)) {
    test('Metro rejeita PNG com conteúdo ' + formato + ' malformado sem travar', () => {
        const codigo = `
            const assert = require('node:assert/strict');
            const { getAssetSize } = require('metro/private/Assets');
            const imagem = Buffer.from(process.argv[1], 'base64');

            assert.throws(() => getAssetSize('png', imagem, 'invalida.png'), /Invalid png image asset/);
        `;

        execFileSync(process.execPath, ['-e', codigo, imagem.toString('base64')], {
            cwd: raiz,
            timeout: 3000,
            stdio: 'pipe',
            windowsHide: true,
        });
    });
}
