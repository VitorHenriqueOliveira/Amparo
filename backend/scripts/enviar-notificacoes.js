import sql from '../src/db.js';
import { criarProcessadorNotificacoes } from '../src/services/notificacoes.js';

try {
    const resumo = await criarProcessadorNotificacoes({ sql }).processar();

    console.log('Processamento dos lembretes:', JSON.stringify(resumo));
} catch {
    console.error('Não foi possível processar os lembretes. Confira a configuração da API e as migrações.');
    process.exitCode = 1;
}
