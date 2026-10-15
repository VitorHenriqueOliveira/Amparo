// As impressões dos registros ficam somente na transação, sem sair do banco ou aparecer nos logs.
const tabelas = [
    ['usuario', 'id_usuario', "to_jsonb(t) - 'data_cadastro' || jsonb_build_object('data_cadastro', extract(epoch FROM data_cadastro))"],
    ['diario', 'id_diario', "to_jsonb(t) - 'data_registro' || jsonb_build_object('data_registro', extract(epoch FROM data_registro))"],
    ['emocao', 'id_emocao', 'to_jsonb(t)'],
    ['registro_emocional', 'id_registro_emocao', "to_jsonb(t) - 'data_registro' - 'hora_registro' - 'id_cliente' - 'id_registro_emocional' - 'id_registro_emocao' || jsonb_build_object('data_registro', extract(epoch FROM data_registro), 'id_registro_emocao', coalesce(to_jsonb(t)->'id_registro_emocao', to_jsonb(t)->'id_registro_emocional'))"],
    ['sono', 'id_sono', "to_jsonb(t) - 'fuso_horario'"],
    ['calma_historico', 'id_calma', 'to_jsonb(t)'],
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
    IF EXISTS (
        SELECT impressao FROM validacao_migracao WHERE tabela = '${tabela}'
        EXCEPT ALL
        SELECT md5((${expressao})::text) FROM public.${tabela} t
    ) THEN
        RAISE EXCEPTION 'Histórico alterado durante a migração: ${tabela}' USING ERRCODE = 'P0001';
    END IF;
END $$`);
