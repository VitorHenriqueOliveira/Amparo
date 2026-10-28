import { criarApp } from './app.js';
import { validarAmbiente } from './config/env.js';
import sql from './db.js';
import { criarProcessadorNotificacoes } from './services/notificacoes.js';

const configuracao = validarAmbiente();
const app = criarApp(configuracao);

app.listen(configuracao.porta, () => {
    console.log('Backend rodando na porta ' + configuracao.porta + '!');
});

if (process.env.NOTIFICACOES_ATIVAS === 'true') {
    const processador = criarProcessadorNotificacoes({ sql });
    let processando = false;
    const executar = async () => {
        if (processando) return;

        processando = true;

        try {
            await processador.processar();
        } catch {
            console.error('Não foi possível processar os lembretes.');
        } finally {
            processando = false;
        }
    };

    setInterval(executar, 60000).unref();
    executar();
}
