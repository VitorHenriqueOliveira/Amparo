import express from 'express';
import cors from 'cors';
import rotasDiario from './routes/diario.js';
import rotasUsuario from './routes/usuario.js';

const app = express();

app.use(cors());
app.use(express.json());

// Ligando as rotas

// Rotas públicas
app.use('/api', rotasUsuario);
// Rotas protegidas
app.use('/api', rotasDiario); 

app.listen(3000, () => {
    console.log('Backend rodando na porta 3000!');
});