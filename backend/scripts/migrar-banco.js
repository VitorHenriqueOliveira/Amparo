import sql from '../src/db.js';
import { lerMigracoes } from './sql-migrations.js';
import { criarValidacao, salvarImpressoes, conferirImpressoes } from './preservar-registros.js';

try {
    const migracoes = await lerMigracoes();
    const [existe] = await sql`SELECT to_regclass('public.schema_migrations') IS NOT NULL AS existe`;
    const aplicadas = existe.existe ? await sql`SELECT nome, checksum FROM public.schema_migrations` : [];

    for (const aplicada of aplicadas) {
        const arquivo = migracoes.find((migracao) => migracao.nome === aplicada.nome);

        if (!arquivo || arquivo.checksum !== aplicada.checksum) {
            throw Object.assign(new Error('Uma migração aplicada foi modificada.'), { code: 'CHECKSUM_DIVERGENTE' });
        }
    }

    const pendentes = migracoes.filter((migracao) => !aplicadas.some((aplicada) => aplicada.nome === migracao.nome));

    if (!process.argv.includes('--apply')) {
        console.log(JSON.stringify({ modo: 'somente leitura', pendentes: pendentes.map((migracao) => migracao.nome) }, null, 4));
    } else if (!pendentes.length) {
        console.log('Nenhuma migração pendente.');
    } else {
        const comandos = [
            sql`SET LOCAL lock_timeout = '5s'`,
            sql`SET LOCAL statement_timeout = '30s'`,
            sql`SET LOCAL TIME ZONE 'UTC'`,
            sql`SELECT pg_advisory_xact_lock(4826719)`,
            sql`CREATE TABLE IF NOT EXISTS public.schema_migrations (
                nome TEXT PRIMARY KEY, checksum TEXT NOT NULL,
                aplicada_em TIMESTAMPTZ NOT NULL DEFAULT statement_timestamp()
            )`,
        ];

        comandos.push(sql.query(criarValidacao), ...salvarImpressoes.map((comando) => sql.query(comando)));

        for (const migracao of pendentes) {
            // Um concorrente que já aplicou o arquivo faz esta transação abortar e ser reavaliada.
            comandos.push(sql`INSERT INTO public.schema_migrations (nome, checksum) VALUES (${migracao.nome}, ${migracao.checksum})`);
            comandos.push(...migracao.comandos.map((comando) => sql.query(comando)));
        }

        comandos.push(...conferirImpressoes.map((comando) => sql.query(comando)));

        await sql.transaction(comandos);
        console.log('Migrações aplicadas em uma transação:', pendentes.map((migracao) => migracao.nome).join(', '));
    }
} catch (error) {
    // Mensagens do driver podem conter dados da conexão ou de registros; não são expostas.
    console.error('Migração não concluída. Código:', error.code || 'CONEXAO_OU_ARQUIVO_INVALIDO');
    process.exitCode = 1;
}
