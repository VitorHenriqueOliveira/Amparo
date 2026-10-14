import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { validarAmbiente } from './config/env.js';

// O caminho fixo evita carregar outro .env por engano.
dotenv.config({
    path: fileURLToPath(new URL('../.env', import.meta.url)),
    quiet: true,
});

const configuracao = validarAmbiente();
const sql = neon(configuracao.databaseUrl);

export default sql;
