import { criarApp } from './app.js';
import { validarAmbiente } from './config/env.js';

const configuracao = validarAmbiente();
const app = criarApp(configuracao);

app.listen(configuracao.porta, () => {
    console.log('Backend rodando na porta ' + configuracao.porta + '!');
});
