import express from 'express';
import { createHash } from 'node:crypto';
import sql from '../db.js';
import verificarToken from '../middlewares/auth.js';

const router = express.Router();
router.use('/historicos', verificarToken);
const emocoes = new Set(['Feliz', 'Triste', 'Neutro', 'Raiva']);
const hora = /^([01]\d|2[0-3]):[0-5]\d$/;

function diaValido(valor) {
    if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor) || valor < '0001-01-01') return false;
    const data = new Date(valor + 'T00:00:00Z');
    return Number.isFinite(data.getTime()) && data.toISOString().slice(0, 10) === valor;
}

function instanteValido(valor) {
    if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(valor)) return false;
    const data = new Date(valor);
    return Number.isFinite(data.getTime()) && data.toISOString() === valor && valor >= '0001-01-01'
        && data.getTime() <= Date.now();
}

function fusoValido(valor) {
    if (typeof valor !== 'string' || valor.length > 100 || /^[+-]/.test(valor)) return false;
    try {
        new Intl.DateTimeFormat('en', { timeZone: valor });
        return true;
    } catch { return false; }
}

function hojeNoFuso(fuso) {
    const partes = new Intl.DateTimeFormat('en', {
        timeZone: fuso, year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(new Date());
    const obter = (tipo) => partes.find((parte) => parte.type === tipo).value;
    return obter('year') + '-' + obter('month') + '-' + obter('day');
}

function normalizar(tipo, dados) {
    if (!dados || typeof dados !== 'object' || Array.isArray(dados)) return null;
    const somente = (campos) => Object.keys(dados).every((campo) => campos.includes(campo));
    if (tipo === 'emocoes' && somente(['id_emocao', 'registrado_em'])
        && emocoes.has(dados.id_emocao) && instanteValido(dados.registrado_em)) {
        return { id_emocao: dados.id_emocao, registrado_em: dados.registrado_em };
    }
    if (tipo === 'sono' && somente(['dia', 'hora_dormiu', 'hora_acordou', 'fuso_horario'])
        && diaValido(dados.dia) && fusoValido(dados.fuso_horario) && dados.dia <= hojeNoFuso(dados.fuso_horario)
        && typeof dados.hora_dormiu === 'string' && hora.test(dados.hora_dormiu)
        && typeof dados.hora_acordou === 'string' && hora.test(dados.hora_acordou)
        && dados.hora_dormiu !== dados.hora_acordou) {
        return { dia: dados.dia, hora_dormiu: dados.hora_dormiu, hora_acordou: dados.hora_acordou,
            fuso_horario: dados.fuso_horario };
    }
    if (tipo === 'diario' && typeof dados.descricao === 'string' && dados.descricao.trim()
        && dados.descricao.length <= 10000) {
        if (somente(['descricao', 'registrado_em']) && instanteValido(dados.registrado_em)) {
            return { descricao: dados.descricao, registrado_em: dados.registrado_em };
        }
        if (somente(['descricao', 'dia', 'fuso_horario']) && diaValido(dados.dia)
            && fusoValido(dados.fuso_horario) && dados.dia <= hojeNoFuso(dados.fuso_horario)) {
            return { descricao: dados.descricao, dia: dados.dia, fuso_horario: dados.fuso_horario };
        }
    }
    return null;
}

// Somente esta rota de importação aceita as datas dos registros antigos.
router.post('/historicos/importar', async (req, res) => {
    const { tipo, chave, dados } = req.body || {};
    const normalizado = normalizar(tipo, dados);
    if (!req.body || Array.isArray(req.body) || Object.keys(req.body).some((campo) => !['tipo', 'chave', 'dados'].includes(campo))
        || typeof chave !== 'string' || !/^[0-9a-f]{64}$/.test(chave) || !normalizado) {
        return res.status(400).json({ erro: 'Confira o tipo, a identificação e os dados do histórico antigo.' });
    }
    try {
        // O dia legado permanece o mesmo se o aparelho mudar de fuso entre dois envios.
        const conteudo = normalizado.dia ? { ...normalizado, fuso_horario: undefined } : normalizado;
        const assinatura = createHash('sha256').update(JSON.stringify(conteudo)).digest('hex');
        const [resultado] = await sql`SELECT * FROM public.importar_historico_legado(
            ${req.id_usuario_logado}::integer, ${tipo}::text, ${chave}::text,
            ${assinatura}::text, ${JSON.stringify(normalizado)}::jsonb)`;
        return res.json({ tipo, chave, ...resultado });
    } catch (erro) {
        if (erro.code === '23503') return res.status(401).json({ erro: 'Sessão inválida.' });
        return res.status(500).json({ erro: 'Não foi possível importar o registro. O original permanece no aparelho.' });
    }
});

export default router;
