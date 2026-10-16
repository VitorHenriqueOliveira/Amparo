import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';

export function separarComandos(texto) {
    const comandos = [];
    // Não separa os pontos e vírgulas de literais, comentários ou blocos PL/pgSQL.
    const tokens = /(\$\$[\s\S]*?\$\$|'(?:[^']|'')*'|"(?:[^"]|"")*"|--[^\n]*|\/\*[\s\S]*?\*\/)|;/g;
    let inicio = 0;

    for (const token of texto.matchAll(tokens)) {
        if (token[1]) continue;

        const comando = texto.slice(inicio, token.index + 1).trim();
        inicio = token.index + 1;

        if (comando && !/^(BEGIN|COMMIT);$/i.test(comando)) comandos.push(comando);
    }

    if (texto.slice(inicio).trim()) throw new Error('Migração com comando não terminado.');

    return comandos;
}

export async function lerMigracoes() {
    const diretorio = new URL('../migrations/', import.meta.url);
    const nomes = (await readdir(diretorio)).filter((nome) => /^\d{3}_.+\.sql$/.test(nome)).sort();

    return Promise.all(nomes.map(async (nome) => {
        const texto = await readFile(new URL(nome, diretorio), 'utf8');

        return {
            nome,
            checksum: createHash('sha256').update(texto.replace(/\r\n/g, '\n')).digest('hex'),
            comandos: separarComandos(texto),
        };
    }));
}
