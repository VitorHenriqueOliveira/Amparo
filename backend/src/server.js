import express from 'express';
import cors from 'cors';
import rotasDiario from './routes/diario.js';
import rotasUsuario from './routes/usuario.js';

const app = express();

app.use(cors());
app.use(express.json());

// Ligando as rotas
app.use('/api', rotasDiario); 
app.use('/api', rotasUsuario);

app.listen(3000, () => {
    console.log('Backend rodando na porta 3000!');
});