import { useEffect, useState } from 'react';
import { FlatList, Modal, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { listarDiarioPeriodo } from '../services/diario';
import { criarEstilos } from '../theme/estilos';
import { CORES, MEDIDAS } from '../theme/tema';

export default function RegistrosDiario({ periodo, onFechar, onAbrirDiario }) {
    const [pagina, setPagina] = useState(1);
    const [tentativa, setTentativa] = useState(0);
    const [dados, setDados] = useState(null);
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState(false);

    useEffect(() => {
        let ativo = true;

        setCarregando(true);
        setErro(false);
        setDados(null);
        listarDiarioPeriodo(periodo.inicio, periodo.fim, pagina)
            .then((resposta) => {
                if (!ativo) return;

                const ultimaPagina = Math.max(1, resposta.totalPaginas);

                if (pagina > ultimaPagina) setPagina(ultimaPagina);
                else setDados(resposta);
            })
            .catch(() => { if (ativo) setErro(true); })
            .finally(() => { if (ativo) setCarregando(false); });

        return () => { ativo = false; };
    }, [periodo.inicio, periodo.fim, pagina, tentativa]);

    const resposta = dados?.pagina === pagina ? dados : null;

    return (
        <Modal visible transparent animationType="fade" onRequestClose={onFechar}>
            <View style={styles.fundo}>
                <View style={styles.cartao} accessibilityViewIsModal>
                    <View style={styles.cabecalho}>
                        <View style={styles.tituloArea}>
                            <Text style={styles.titulo}>Seu diário</Text>
                            <Text style={styles.periodo}>{periodo.intervalo}</Text>
                        </View>
                        <TouchableOpacity onPress={onFechar} style={styles.fechar}
                            accessibilityRole="button" accessibilityLabel="Fechar registros do diário">
                            <Ionicons name="close" size={26} color={CORES.icone} />
                        </TouchableOpacity>
                    </View>

                    {carregando ? (
                        <Text style={styles.mensagem} accessibilityLiveRegion="polite">Carregando registros do diário…</Text>
                    ) : erro ? (
                        <View>
                            <Text style={styles.mensagem} accessibilityRole="alert">
                                Não foi possível carregar seu diário. Verifique a conexão e tente novamente.
                            </Text>
                            <TouchableOpacity onPress={() => setTentativa((valor) => valor + 1)} style={styles.botao}
                                accessibilityRole="button" accessibilityLabel="Tentar carregar diário novamente">
                                <Text style={styles.botaoTexto}>Tentar novamente</Text>
                            </TouchableOpacity>
                        </View>
                    ) : resposta ? (
                        <>
                            <Text style={styles.resumo} accessibilityLiveRegion="polite">
                                {resposta.total} {resposta.total === 1 ? 'registro neste período' : 'registros neste período'}
                            </Text>
                            <FlatList
                                key={pagina}
                                data={resposta.notas}
                                keyExtractor={(nota) => String(nota.id)}
                                style={styles.lista}
                                contentContainerStyle={styles.conteudoLista}
                                ListEmptyComponent={<Text style={styles.mensagem}>Nenhum registro do diário neste período.</Text>}
                                renderItem={({ item }) => (
                                    <View style={styles.nota}>
                                        <Text style={styles.data}>
                                            {new Date(item.createdAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                                        </Text>
                                        <Text style={styles.texto} selectable>{item.text}</Text>
                                    </View>
                                )}
                            />
                            {resposta.totalPaginas > 1 && (
                                <View style={styles.paginacao}>
                                    <TouchableOpacity disabled={pagina <= 1} onPress={() => setPagina((valor) => Math.max(1, valor - 1))}
                                        style={styles.fechar} accessibilityRole="button" accessibilityLabel="Página anterior do diário"
                                        accessibilityState={{ disabled: pagina <= 1 }}>
                                        <Ionicons name="chevron-back" size={24} color={pagina <= 1 ? '#66754E' : CORES.icone} />
                                    </TouchableOpacity>
                                    <Text style={styles.resumo}>Página {pagina} de {resposta.totalPaginas}</Text>
                                    <TouchableOpacity disabled={pagina >= resposta.totalPaginas}
                                        onPress={() => setPagina((valor) => Math.min(resposta.totalPaginas, valor + 1))}
                                        style={styles.fechar} accessibilityRole="button" accessibilityLabel="Próxima página do diário"
                                        accessibilityState={{ disabled: pagina >= resposta.totalPaginas }}>
                                        <Ionicons name="chevron-forward" size={24} color={pagina >= resposta.totalPaginas ? '#66754E' : CORES.icone} />
                                    </TouchableOpacity>
                                </View>
                            )}
                        </>
                    ) : null}

                    <TouchableOpacity onPress={onAbrirDiario} style={styles.botao}
                        accessibilityRole="button" accessibilityLabel="Abrir tela do diário">
                        <Text style={styles.botaoTexto}>Abrir diário</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = criarEstilos({
    fundo: { flex: 1, padding: 20, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.65)' },
    cartao: { width: '100%', maxWidth: MEDIDAS.larguraMaxima, maxHeight: '85%', padding: 20, borderRadius: 25, backgroundColor: CORES.cartao },
    cabecalho: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    tituloArea: { flex: 1 },
    titulo: { color: CORES.icone, fontSize: 21, fontWeight: '800' },
    periodo: { color: CORES.textoSuave, marginTop: 6, fontSize: 13 },
    fechar: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    lista: { flexGrow: 0, flexShrink: 1, minHeight: 0 },
    conteudoLista: { paddingVertical: 8 },
    nota: { paddingVertical: 16, borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
    data: { color: CORES.icone, fontSize: 12, fontWeight: '700', marginBottom: 10 },
    texto: { color: CORES.texto, fontSize: 15, lineHeight: 23 },
    resumo: { color: CORES.textoSuave, fontSize: 12 },
    mensagem: { color: CORES.textoSuave, fontSize: 14, lineHeight: 21, paddingVertical: 20, textAlign: 'center' },
    paginacao: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
    botao: { backgroundColor: CORES.acento, borderRadius: 16, padding: 14, alignItems: 'center', marginTop: 16 },
    botaoTexto: { color: CORES.textoEscuro, fontWeight: '800', fontSize: 14 },
});
