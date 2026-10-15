import sql from '../src/db.js';

try {
    const resultados = await sql.transaction([
        sql`SELECT 'usuario' AS tabela, count(*)::int AS registros,
            count(*) FILTER (WHERE length(btrim(nome)) NOT BETWEEN 1 AND 100 OR nome !~ '[^[:space:]]')::int AS nomes_invalidos,
            count(*) FILTER (WHERE btrim(email) !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$')::int AS emails_invalidos,
            count(*) FILTER (WHERE senha !~ '[^[:space:]]')::int AS senhas_vazias,
            count(*) FILTER (WHERE meta_sono_horas_min NOT BETWEEN 1 AND 24
                OR meta_sono_horas_max NOT BETWEEN meta_sono_horas_min AND 24)::int AS metas_invalidas,
            count(*) FILTER (WHERE NOT isfinite(data_cadastro))::int AS datas_invalidas FROM usuario`,
        sql`SELECT 'diario' AS tabela, count(*)::int AS registros,
            count(*) FILTER (WHERE descricao IS NULL OR length(btrim(descricao)) NOT BETWEEN 1 AND 10000 OR descricao !~ '[^[:space:]]')::int AS descricoes_invalidas,
            count(*) FILTER (WHERE NOT isfinite(data_registro))::int AS datas_invalidas FROM diario`,
        sql`SELECT 'emocao' AS tabela, count(*)::int AS registros,
            count(*) FILTER (WHERE id_emocao !~ '[^[:space:]]' OR descricao IS NULL OR descricao !~ '[^[:space:]]')::int AS valores_invalidos FROM emocao`,
        sql`SELECT 'registro_emocional' AS tabela, count(*)::int AS registros,
            count(*) FILTER (WHERE hora_registro <> ((data_registro AT TIME ZONE 'UTC')::time))::int AS horarios_divergentes,
            count(*) FILTER (WHERE NOT isfinite(data_registro))::int AS datas_invalidas FROM registro_emocional`,
        sql`SELECT 'sono' AS tabela, count(*)::int AS registros,
            count(*) FILTER (WHERE hora_dormiu = hora_acordou OR hora_dormiu >= time '24:00' OR hora_acordou >= time '24:00')::int AS horarios_invalidos,
            (SELECT count(*)::int FROM (SELECT id_usuario, data_registro FROM sono GROUP BY 1, 2 HAVING count(*) > 1) duplicados) AS dias_duplicados,
            count(*) FILTER (WHERE NOT isfinite(data_registro))::int AS datas_invalidas FROM sono`,
        sql`SELECT 'calma_historico' AS tabela, count(*)::int AS registros,
            count(*) FILTER (WHERE duracao_segundos <= 0)::int AS duracoes_invalidas,
            count(*) FILTER (WHERE NOT isfinite(concluido_em) OR NOT isfinite(recebido_em))::int AS datas_invalidas FROM calma_historico`,
    ], { readOnly: true });

    console.log(JSON.stringify(resultados.map((resultado) => resultado[0]), null, 4));
} catch (error) {
    console.error('Auditoria não concluída. Código:', error.code || 'CONEXAO_INDISPONIVEL');
    process.exitCode = 1;
}
