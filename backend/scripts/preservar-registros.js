// As impressões dos registros ficam somente na transação, sem sair do banco ou aparecer nos logs.
const tabelas = [
    ['usuario', 'id_usuario', "to_jsonb(t) - 'data_cadastro' - 'st_notificacao' || jsonb_build_object('data_cadastro', extract(epoch FROM data_cadastro), 'st_notificacao', coalesce(nullif(to_jsonb(t)->'st_notificacao', 'null'::jsonb), 'true'::jsonb))"],
    ['diario', 'id_diario', "to_jsonb(t) - 'data_registro' || jsonb_build_object('data_registro', extract(epoch FROM data_registro))"],
    ['emocao', 'id_emocao', 'to_jsonb(t)'],
    ['registro_emocional', 'id_registro_emocao', "to_jsonb(t) - 'data_registro' - 'hora_registro' - 'id_cliente' - 'id_registro_emocional' - 'id_registro_emocao' || jsonb_build_object('data_registro', extract(epoch FROM data_registro), 'id_registro_emocao', coalesce(to_jsonb(t)->'id_registro_emocao', to_jsonb(t)->'id_registro_emocional'))"],
    ['sono', 'id_sono', "to_jsonb(t) - 'fuso_horario'"],
    ['calma_historico', 'id_calma', 'to_jsonb(t)'],
    ['importacao_historico', 'chave', 'to_jsonb(t)'],
    ['notificacao_dispositivo', 'id_instalacao', 'to_jsonb(t)'],
    ['notificacao_lembrete', 'id_lembrete', 'to_jsonb(t)'],
    ['notificacao_envio', 'id_envio', 'to_jsonb(t)'],
    ['usuario_foto', 'id_usuario', 'to_jsonb(t)'],
];

function literal(valor) {
    return "'" + valor.replaceAll("'", "''") + "'";
}

export const criarValidacao = `CREATE TEMP TABLE validacao_migracao (
    tabela TEXT NOT NULL, impressao TEXT NOT NULL
) ON COMMIT DROP`;

export const salvarImpressoes = tabelas.map(([tabela, , expressao]) => `DO $$
BEGIN
    IF to_regclass('public.${tabela}') IS NOT NULL THEN
        EXECUTE ${literal(`INSERT INTO validacao_migracao SELECT '${tabela}', md5((${expressao})::text) FROM public.${tabela} t`)};
    END IF;
END $$`);

export const conferirImpressoes = tabelas.map(([tabela, , expressao]) => `DO $$
BEGIN
    IF to_regclass('public.${tabela}') IS NULL THEN
        IF EXISTS (SELECT 1 FROM validacao_migracao WHERE tabela = '${tabela}') THEN
            RAISE EXCEPTION 'Histórico removido durante a migração: ${tabela}' USING ERRCODE = 'P0001';
        END IF;
    ELSE
        IF EXISTS (
            SELECT impressao FROM validacao_migracao WHERE tabela = '${tabela}'
            EXCEPT ALL
            SELECT md5((${expressao})::text) FROM public.${tabela} t
        ) THEN
            RAISE EXCEPTION 'Histórico alterado durante a migração: ${tabela}' USING ERRCODE = 'P0001';
        END IF;
    END IF;
END $$`);
