import express from 'express';
import sql from '../db.js';
import verificarToken from '../middlewares/auth.js';

const router = express.Router();
const chaves = ['feliz', 'triste', 'neutro', 'raiva'];
const conselhos = {
    feliz: {
        titulo: 'Valorize o que faz bem',
        texto: 'A felicidade apareceu com mais frequência nos seus registros. Se quiser, anote no diário o que contribuiu para esses momentos e quais hábitos gostaria de cultivar.',
        icone: 'sunny-outline',
    },
    triste: {
        titulo: 'Acolha o que você está sentindo',
        texto: 'A tristeza apareceu com mais frequência nos seus registros. Reserve um momento para respirar, escrever no diário ou conversar com alguém de confiança. Você não precisa resolver tudo de uma vez.',
        icone: 'rainy-outline',
    },
    neutro: {
        titulo: 'Observe seu ritmo',
        texto: 'A neutralidade apareceu com mais frequência. Aproveite para observar suas necessidades e escolher uma pequena atividade que lhe traga bem-estar.',
        icone: 'cloud-outline',
    },
    raiva: {
        titulo: 'Faça uma pausa gentil',
        texto: 'A raiva apareceu com mais frequência neste período. Quando precisar, faça uma pausa, respire lentamente e retome a situação quando estiver mais confortável.',
        icone: 'leaf-outline',
    },
};

function diaValido(valor) {
    if (typeof valor !== 'string' || !/^[1-9]\d{3}-\d{2}-\d{2}$/.test(valor)) return false;
    const data = new Date(valor + 'T00:00:00Z');
    return Number.isFinite(data.getTime()) && data.toISOString().slice(0, 10) === valor;
}

function fusoValido(valor) {
    if (typeof valor !== 'string' || valor.length > 100 || /^[+-]/.test(valor)) return false;
    try {
        new Intl.DateTimeFormat('en', { timeZone: valor });
        return true;
    } catch {
        return false;
    }
}

// Distribui o arredondamento para que a legenda sempre some exatamente 100%.
function calcularPercentuais(contagens, total) {
    const partes = chaves.map((chave) => ({ chave, valor: total ? contagens[chave] * 100 / total : 0 }));
    const resultado = Object.fromEntries(partes.map(({ chave, valor }) => [chave, Math.floor(valor)]));
    let restantes = total ? 100 - Object.values(resultado).reduce((soma, valor) => soma + valor, 0) : 0;
    partes.sort((a, b) => (b.valor % 1) - (a.valor % 1));
    for (const { chave } of partes) {
        if (restantes-- <= 0) break;
        resultado[chave]++;
    }
    return resultado;
}

router.get('/emocoes/evolucao', verificarToken, async (req, res) => {
    const { inicio, fim, fuso_horario: fuso } = req.query;
    const dias = (Date.parse(fim) - Date.parse(inicio)) / 86400000;
    if (Object.keys(req.query).some((chave) => !['inicio', 'fim', 'fuso_horario'].includes(chave))
        || !diaValido(inicio) || !diaValido(fim) || !fusoValido(fuso)
        || dias < 0 || dias > 365) {
        return res.status(400).json({ erro: 'Informe datas válidas, em ordem, com até 366 dias e um fuso horário válido.' });
    }

    try {
        // Limites inclusivos em dias locais, convertidos para instantes. O índice por conta e data é preservado.
        const registros = await sql`
            WITH periodo AS (
                SELECT ${inicio}::date AS inicio, ${fim}::date AS fim, ${fuso}::text AS fuso,
                    ${inicio}::timestamp AT TIME ZONE ${fuso} AS de,
                    (${fim}::date + 1)::timestamp AT TIME ZONE ${fuso} AS ate
            ), emocoes AS (
                SELECT (r.data_registro AT TIME ZONE p.fuso)::date AS dia,
                    count(*) FILTER (WHERE r.id_emocao = 'Feliz')::int AS feliz,
                    count(*) FILTER (WHERE r.id_emocao = 'Triste')::int AS triste,
                    count(*) FILTER (WHERE r.id_emocao = 'Neutro')::int AS neutro,
                    count(*) FILTER (WHERE r.id_emocao = 'Raiva')::int AS raiva,
                    (array_agg(r.id_emocao ORDER BY r.data_registro DESC, r.id_registro_emocao DESC))[1] AS ultima_emocao
                FROM registro_emocional r CROSS JOIN periodo p
                WHERE r.id_usuario = ${req.id_usuario_logado} AND r.data_registro >= p.de AND r.data_registro < p.ate
                    AND r.id_emocao IN ('Feliz', 'Triste', 'Neutro', 'Raiva')
                GROUP BY dia
            ), notas AS (
                SELECT (d.data_registro AT TIME ZONE p.fuso)::date AS dia, count(*)::int AS quantidade
                FROM diario d CROSS JOIN periodo p
                WHERE d.id_usuario = ${req.id_usuario_logado} AND d.data_registro >= p.de AND d.data_registro < p.ate
                GROUP BY dia
            ), descanso AS (
                SELECT s.data_registro AS dia,
                    (EXTRACT(EPOCH FROM (s.hora_acordou - s.hora_dormiu +
                        CASE WHEN s.hora_acordou < s.hora_dormiu THEN INTERVAL '24 hours' ELSE INTERVAL '0' END)) / 60)::int AS minutos
                FROM sono s CROSS JOIN periodo p
                WHERE s.id_usuario = ${req.id_usuario_logado} AND s.data_registro BETWEEN p.inicio AND p.fim
            )
            SELECT dia::date::text AS dia, COALESCE(e.feliz, 0) AS feliz, COALESCE(e.triste, 0) AS triste,
                COALESCE(e.neutro, 0) AS neutro, COALESCE(e.raiva, 0) AS raiva, e.ultima_emocao,
                s.minutos AS minutos_sono, COALESCE(n.quantidade, 0) AS total_notas,
                u.meta_sono_horas_min, u.meta_sono_horas_max
            FROM usuario u CROSS JOIN periodo p
            CROSS JOIN LATERAL generate_series(p.inicio::timestamp, p.fim::timestamp, INTERVAL '1 day') AS datas(dia)
            LEFT JOIN emocoes e USING (dia)
            LEFT JOIN notas n USING (dia)
            LEFT JOIN descanso s USING (dia)
            WHERE u.id_usuario = ${req.id_usuario_logado}
            ORDER BY dia
        `;
        if (!registros.length) return res.status(401).json({ erro: 'Sessão inválida.' });

        const contagens = Object.fromEntries(chaves.map((chave) => [chave,
            registros.reduce((soma, registro) => soma + registro[chave], 0)]));
        const total = Object.values(contagens).reduce((soma, valor) => soma + valor, 0);
        const maior = Math.max(...Object.values(contagens));
        const predominantes = total ? chaves.filter((chave) => contagens[chave] === maior) : [];
        const conselho = total === 0 ? {
            titulo: 'Comece por você',
            texto: 'Não há emoções registradas neste período. Registre como está se sentindo e acompanhe seus próximos momentos.',
            icone: 'leaf-outline',
        } : predominantes.length === 1 ? conselhos[predominantes[0]] : {
            titulo: 'Continue se observando',
            texto: 'Há um empate entre as emoções mais registradas neste período. Continue anotando como se sente e observe o que acontece ao seu redor.',
            icone: 'leaf-outline',
        };
        const duracoes = registros.filter((item) => item.minutos_sono !== null).map((item) => item.minutos_sono);
        const mediaSono = duracoes.length ? Math.round(duracoes.reduce((soma, valor) => soma + valor, 0) / duracoes.length) : null;
        const meta = { min: registros[0].meta_sono_horas_min, max: registros[0].meta_sono_horas_max };
        const alertaSono = mediaSono !== null && mediaSono < meta.min * 60 ? {
            titulo: 'Dê atenção ao seu descanso',
            texto: `Sua média de sono está abaixo da sua meta de ${meta.min} a ${meta.max} horas neste período. Observe sua rotina de descanso. Esse dado, sozinho, não explica como você está se sentindo.`,
            icone: 'moon-outline',
        } : null;

        return res.json({
            periodo: { inicio, fim, fuso_horario: fuso }, total, contagens,
            percentuais: calcularPercentuais(contagens, total), predominantes, conselho, alertaSono,
            mediaSono, totalSono: duracoes.length, meta,
            totalNotas: registros.reduce((soma, item) => soma + item.total_notas, 0),
            dias: registros.map((item) => ({
                chave: item.dia,
                emocao: item.ultima_emocao ? { emotionKey: item.ultima_emocao.toLowerCase() } : null,
                sono: item.minutos_sono === null ? null : { totalMinutes: item.minutos_sono },
                quantidadeNotas: item.total_notas,
            })),
        });
    } catch {
        return res.status(500).json({ erro: 'Não foi possível carregar sua evolução emocional. Tente novamente.' });
    }
});

export default router;
