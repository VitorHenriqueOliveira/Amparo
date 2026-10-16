import { criarEstilos } from '../theme/estilos';
import { AreaDaTela, Cabecalho, NavegacaoInferior } from '../components/NavegacaoPadrao';
import { CORES, DEGRADES } from '../theme/tema';
import { useCallback, useMemo, useState, useContext } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import Svg, { Path, Circle } from 'react-native-svg';
import { buscarEvolucao } from '../services/evolucao';
import { formatarDuracao } from '../utils/sono';
import { chaveData, obterPeriodo, moverPeriodo, nomeDia } from '../utils/evolucao';
import { AuthContext } from '../contexts/AuthContext';
import RegistrosDiario from '../components/RegistrosDiario';
const EMOCOES = {
    feliz: {
        titulo: 'Feliz',
        cor: '#A7D64F',
        icone: 'sunny-outline',
    },
    triste: {
        titulo: 'Triste',
        cor: '#527D28',
        icone: 'rainy-outline',
    },
    neutro: {
        titulo: 'Neutro',
        cor: '#D4E99B',
        icone: 'cloud-outline',
    },
    raiva: {
        titulo: 'Raiva',
        cor: '#31551D',
        icone: 'thunderstorm-outline',
    },
};
const FILTROS = ['Dia', 'Semana', 'Mês'];

function eventosDoSetor(aoSelecionar) {
    // No navegador, evita que o SVG repasse eventos de toque nativos para o DOM.
    return Platform.OS === 'web'
        ? { onPress: null, onClick: aoSelecionar, style: { cursor: 'pointer' } }
        : { onPress: aoSelecionar };
}

function gerarSetor(inicioAngulo, fimAngulo, raio = 86, centro = 100) {
    const rad = (angulo) => (angulo * Math.PI) / 180;
    const x1 = centro + raio * Math.cos(rad(inicioAngulo));
    const y1 = centro + raio * Math.sin(rad(inicioAngulo));
    const x2 = centro + raio * Math.cos(rad(fimAngulo));
    const y2 = centro + raio * Math.sin(rad(fimAngulo));
    const grandeArco = fimAngulo - inicioAngulo > 180 ? 1 : 0;
    return [
        `M ${centro} ${centro}`,
        `L ${x1} ${y1}`,
        `A ${raio} ${raio} 0 ${grandeArco} 1 ${x2} ${y2}`,
        'Z',
    ].join(' ');
}
function GraficoPizza({ contagens, percentuais, total }) {
    const [selecionada, setSelecionada] = useState(null);
    const setores = useMemo(() => {
        if (!total) return [];
        let anguloAtual = -90;
        return Object.entries(EMOCOES)
            .map(([chave, emocao]) => {
                const quantidade = contagens[chave] || 0;
                if (!quantidade) return null;
                const anguloInicial = anguloAtual;
                const anguloFinal = anguloAtual + (quantidade / total) * 360;
                anguloAtual = anguloFinal;
                return {
                    chave,
                    ...emocao,
                    quantidade,
                    percentual: percentuais[chave],
                    anguloInicial,
                    anguloFinal,
                };
            })
            .filter(Boolean);
    }, [contagens, percentuais, total]);
    return (
        <View style={styles.pieArea}>
            <View style={styles.pieWrapper}>
                {total === 0 ? (
                    <View style={styles.pieEmpty}>
                        <Ionicons name="analytics-outline" size={42} color="#6D8D3D" />
                        <Text style={styles.pieEmptyText}>Sem emoções registradas neste período</Text>
                    </View>
                ) : (
                    <Svg width={220} height={220} viewBox="0 0 200 200">
                        {setores.length === 1 ? (
                            <Circle cx="100" cy="100" r="86" fill={setores[0].cor}
                                {...eventosDoSetor(() => setSelecionada(setores[0].chave))} />
                        ) : (
                            setores.map((setor) => (
                                <Path
                                    key={setor.chave}
                                    d={gerarSetor(setor.anguloInicial, setor.anguloFinal)}
                                    fill={setor.cor}
                                    stroke="#F4F9E9"
                                    strokeWidth="1.5"
                                    opacity={selecionada && selecionada !== setor.chave ? 0.45 : 1}
                                    {...eventosDoSetor(() => setSelecionada(setor.chave))}
                                />
                            ))
                        )}
                    </Svg>
                )}
            </View>

            {total > 0 && (
                <Text style={styles.pieSelection} accessibilityLiveRegion="polite">
                    {selecionada
                        ? `${EMOCOES[selecionada].titulo}: ${contagens[selecionada]} registro(s), ${percentuais[selecionada]}%`
                        : 'Toque em uma fatia ou emoção para ver os detalhes.'}
                </Text>
            )}

            {total > 0 && (
                <View style={styles.legend}>
                    {Object.entries(EMOCOES).map(([chave, emocao]) => {
                        const quantidade = contagens[chave] || 0;
                        const percentual = percentuais[chave];
                        return (
                            <TouchableOpacity style={styles.legendRow} key={chave}
                                onPress={() => setSelecionada(selecionada === chave ? null : chave)}
                                accessibilityRole="button"
                                accessibilityLabel={`${emocao.titulo}, ${quantidade} registros, ${percentual}%`}
                                accessibilityState={{ selected: selecionada === chave }}>
                                <View
                                    style={[
                                        styles.legendDot,
                                        {
                                            backgroundColor: emocao.cor,
                                        },
                                    ]}
                                />

                                <Text style={styles.legendName}>{emocao.titulo}</Text>

                                <Text style={styles.legendValue}>
                                    {quantidade} ({percentual}%)
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            )}
        </View>
    );
}
export default function GraficoScreen({ navigation }) {
    const { usuario, revisaoHistoricos } = useContext(AuthContext);
    const idUsuario = usuario.id_usuario;
    const [filtro, setFiltro] = useState('Mês');
    const [referencia, setReferencia] = useState(() => new Date());
    const [tentativa, setTentativa] = useState(0);
    const [dados, setDados] = useState(null);
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState(false);
    const [consultaDiario, setConsultaDiario] = useState(null);
    const periodo = obterPeriodo(filtro, referencia);
    const { inicio, fim } = periodo;

    useFocusEffect(useCallback(() => {
        let ativo = true;
        setCarregando(true);
        setErro(false);
        setDados(null);
        buscarEvolucao(inicio, fim)
            .then((relatorio) => {
                if (ativo) setDados({ idUsuario, relatorio });
            })
            .catch(() => {
                if (ativo) setErro(true);
            })
            .finally(() => {
                if (ativo) setCarregando(false);
            });
        // Uma resposta atrasada não pode substituir o período ou a conta atual.
        return () => { ativo = false; setConsultaDiario(null); };
    }, [idUsuario, inicio, fim, tentativa, revisaoHistoricos]));

    const relatorio = dados?.idUsuario === idUsuario && dados.relatorio.periodo.inicio === inicio
        && dados.relatorio.periodo.fim === fim ? dados.relatorio : null;
    const totalEmocoes = relatorio?.total;
    const totalNotas = relatorio?.totalNotas;
    const mediaSono = relatorio?.mediaSono;
    const dias = relatorio?.dias || [];
    const tituloPeriodo = periodo.titulo;
    const proximaReferencia = moverPeriodo(filtro, referencia, 1);
    const podeAvancar = obterPeriodo(filtro, proximaReferencia).inicio <= chaveData(new Date());

    function abrirDiario() {
        setConsultaDiario(null);
        navigation.navigate('Diario');
    }

    return (
        <LinearGradient colors={DEGRADES.fundo} style={styles.container}>
            <AreaDaTela>
                <Cabecalho titulo="Evolução Emocional" navigation={navigation} />

                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    <Text style={styles.introTitle}>Seu panorama</Text>

                    <Text style={styles.introText}>
                        Acompanhe suas emoções, seu descanso e os momentos que você registra no diário.
                    </Text>

                    {erro && (
                        <View style={styles.errorCard}>
                            <Text style={styles.errorText}>
                                Não foi possível carregar os dados deste período.
                            </Text>
                            <TouchableOpacity onPress={() => setTentativa((valor) => valor + 1)} accessibilityRole="button">
                                <Text style={styles.retryText}>Tentar novamente</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    <View style={styles.summaryRow}>
                        <View style={styles.summaryCard}>
                            <Ionicons name="heart-outline" size={23} color="#D5FF73" />
                            <Text
                                style={styles.summaryNumber}
                                numberOfLines={1}
                                adjustsFontSizeToFit
                                minimumFontScale={0.75}
                            >
                                {totalEmocoes ?? '—'}
                            </Text>
                            <Text style={styles.summaryLabel}>Registros emocionais</Text>
                        </View>

                        <View style={styles.summaryCard}>
                            <Ionicons name="moon-outline" size={23} color="#D5FF73" />
                            <Text
                                style={styles.summaryNumber}
                                numberOfLines={1}
                                adjustsFontSizeToFit
                                minimumFontScale={0.75}
                            >
                                {formatarDuracao(mediaSono)}
                            </Text>
                            <Text style={styles.summaryLabel}>Média de sono</Text>
                        </View>

                        <TouchableOpacity style={styles.summaryCard}
                            onPress={() => setConsultaDiario(periodo)} disabled={!relatorio || carregando}
                            accessibilityRole="button" accessibilityLabel="Ver registros do diário no período"
                            accessibilityState={{ disabled: !relatorio || carregando }}>
                            <Ionicons name="book-outline" size={23} color="#D5FF73" />
                            <Text
                                style={styles.summaryNumber}
                                numberOfLines={1}
                                adjustsFontSizeToFit
                                minimumFontScale={0.75}
                            >
                                {totalNotas ?? '—'}
                            </Text>
                            <Text style={styles.summaryLabel}>Notas no diário</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.filterBox}>
                        <View style={styles.filterTitleArea}>
                            <Text style={styles.periodTitle}>{tituloPeriodo}</Text>
                            <TouchableOpacity onPress={() => setTentativa((valor) => valor + 1)}
                                accessibilityRole="button" accessibilityLabel="Filtrar período selecionado">
                                <Text style={styles.filterButtonText}>Filtrar</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.periodNavigation}>
                            <TouchableOpacity onPress={() => setReferencia(moverPeriodo(filtro, referencia, -1))}
                                accessibilityRole="button" accessibilityLabel="Período anterior" style={styles.periodArrow}>
                                <Ionicons name="chevron-back" size={22} color="#D5FF73" />
                            </TouchableOpacity>
                            <Text style={styles.periodRange}>{periodo.intervalo}</Text>
                            <TouchableOpacity onPress={() => setReferencia(proximaReferencia)} disabled={!podeAvancar}
                                accessibilityRole="button" accessibilityLabel="Próximo período"
                                accessibilityState={{ disabled: !podeAvancar }} style={styles.periodArrow}>
                                <Ionicons name="chevron-forward" size={22} color={podeAvancar ? '#D5FF73' : '#66754E'} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.filterOptions}>
                            {FILTROS.map((opcao) => {
                                const ativo = filtro === opcao;
                                return (
                                    <TouchableOpacity
                                        key={opcao}
                                        onPress={() => { setFiltro(opcao); setReferencia(new Date()); }}
                                        activeOpacity={0.8}
                                        style={[styles.filterButton, ativo && styles.filterButtonActive]}
                                        accessibilityRole="button"
                                        accessibilityState={{ selected: ativo }}
                                    >
                                        <Text
                                            style={[
                                                styles.filterButtonText,
                                                ativo && styles.filterButtonTextActive,
                                            ]}
                                        >
                                            {opcao}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>

                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Suas emoções</Text>

                        <Text style={styles.cardSubtitle}>
                            Distribuição das emoções salvas na sua conta no período selecionado.
                        </Text>

                        {carregando ? (
                            <Text style={styles.emptyText}>Carregando registros...</Text>
                        ) : relatorio ? (
                            <>
                                <GraficoPizza key={`${inicio}-${fim}-${tentativa}`} contagens={relatorio.contagens}
                                    percentuais={relatorio.percentuais} total={totalEmocoes} />

                                {totalEmocoes > 0 && (
                                    <View style={styles.totalPill}>
                                        <Text style={styles.totalPillText}>
                                            {totalEmocoes}{' '}
                                            {totalEmocoes === 1
                                                ? 'registro emocional'
                                                : 'registros emocionais'}
                                        </Text>
                                    </View>
                                )}
                            </>
                        ) : <Text style={styles.emptyText}>Dados indisponíveis.</Text>}
                    </View>

                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Seu diário neste período</Text>
                        {carregando ? (
                            <Text style={styles.emptyText}>Carregando atividade do diário…</Text>
                        ) : relatorio ? (
                            <>
                                <Text style={styles.cardSubtitle}>
                                    {totalNotas > 0
                                        ? `${totalNotas} ${totalNotas === 1 ? 'registro escrito' : 'registros escritos'} em ${relatorio.diario.diasComRegistros} ${relatorio.diario.diasComRegistros === 1 ? 'dia' : 'dias'}. Releia suas palavras e acompanhe seus momentos.`
                                        : 'Você ainda não escreveu no diário neste período.'}
                                </Text>
                                {totalNotas > 0 && (
                                    <TouchableOpacity style={styles.diaryButton} onPress={() => setConsultaDiario(periodo)}
                                        accessibilityRole="button" accessibilityLabel="Ler registros do diário no período">
                                        <Ionicons name="book-outline" size={19} color={CORES.textoEscuro} />
                                        <Text style={styles.diaryButtonText}>Ler registros</Text>
                                    </TouchableOpacity>
                                )}
                                <TouchableOpacity style={styles.diaryLink} onPress={abrirDiario}
                                    accessibilityRole="button" accessibilityLabel="Abrir diário para escrever">
                                    <Text style={styles.diaryLinkText}>Abrir diário</Text>
                                    <Ionicons name="arrow-forward" size={17} color="#D5FF73" />
                                </TouchableOpacity>
                            </>
                        ) : <Text style={styles.emptyText}>Atividade do diário indisponível. Tente carregar o período novamente.</Text>}
                    </View>

                    {[relatorio?.conselho, relatorio?.alertaSono].filter(Boolean).map((conselho) => (
                        <View style={styles.adviceCard} key={conselho.titulo}>
                            <View style={styles.adviceIcon}>
                                <Ionicons name={conselho.icone} size={27} color="#31551D" />
                            </View>

                            <View style={styles.adviceContent}>
                                <Text style={styles.adviceTitle}>{conselho.titulo}</Text>

                                <Text style={styles.adviceText}>{conselho.texto}</Text>
                            </View>
                        </View>
                    ))}

                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Linha do tempo</Text>

                        <Text style={styles.cardSubtitle}>
                            Veja a última emoção registrada em cada dia, o sono informado e a atividade no
                            diário no período selecionado.
                        </Text>

                        {carregando ? (
                            <Text style={styles.emptyText}>Carregando histórico...</Text>
                        ) : relatorio ? (
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.timelineContainer}
                            >
                                {dias.map((dia) => {
                                    const emocao =
                                        dia.emocao && EMOCOES[dia.emocao.emotionKey]
                                            ? EMOCOES[dia.emocao.emotionKey]
                                            : null;
                                    const minutos = dia.sono?.totalMinutes ?? null;
                                    return (
                                        <View style={styles.dayCard} key={dia.chave}>
                                            <Text style={styles.dayName}>{nomeDia(dia.chave)}</Text>

                                            <Text style={styles.dayDate}>{dia.chave.slice(5).split('-').reverse().join('/')}</Text>

                                            <View
                                                style={[
                                                    styles.dayEmotionCircle,
                                                    {
                                                        backgroundColor: emocao
                                                            ? `${emocao.cor}35`
                                                            : 'rgba(255,255,255,0.06)',
                                                        borderColor: emocao
                                                            ? emocao.cor
                                                            : 'rgba(255,255,255,0.16)',
                                                    },
                                                ]}
                                            >
                                                <Ionicons
                                                    name={emocao ? emocao.icone : 'remove-outline'}
                                                    size={24}
                                                    color={emocao ? emocao.cor : '#A2B68C'}
                                                />
                                            </View>

                                            <Text style={styles.dayEmotionTitle} numberOfLines={2}>
                                                {emocao ? emocao.titulo : 'Sem emoção'}
                                            </Text>

                                            <View style={styles.dayDetail}>
                                                <Ionicons name="moon-outline" size={14} color="#D5FF73" />
                                                <Text style={styles.dayDetailText}>
                                                    {formatarDuracao(minutos)}
                                                </Text>
                                            </View>

                                            <TouchableOpacity style={[styles.dayDetail, styles.dayDiary]}
                                                disabled={dia.quantidadeNotas === 0}
                                                onPress={() => setConsultaDiario({ inicio: dia.chave, fim: dia.chave,
                                                    intervalo: `Dia ${dia.chave.split('-').reverse().join('/')}` })}
                                                accessibilityRole="button"
                                                accessibilityLabel={`Ver diário de ${dia.chave.split('-').reverse().join('/')}: ${dia.quantidadeNotas} ${dia.quantidadeNotas === 1 ? 'nota' : 'notas'}`}
                                                accessibilityState={{ disabled: dia.quantidadeNotas === 0 }}>
                                                <Ionicons name="book-outline" size={14} color="#D5FF73" />
                                                <Text style={[styles.dayDetailText, dia.quantidadeNotas > 0 && styles.dayDiaryLink]}>
                                                    {dia.quantidadeNotas} {dia.quantidadeNotas === 1 ? 'nota' : 'notas'}
                                                </Text>
                                            </TouchableOpacity>
                                        </View>
                                    );
                                })}
                            </ScrollView>
                        ) : <Text style={styles.emptyText}>Histórico indisponível.</Text>}
                    </View>

                    <Text style={styles.disclaimer}>
                        Seus registros ajudam na auto-observação, mas não são um diagnóstico nem uma medida
                        clínica da saúde mental.
                    </Text>
                </ScrollView>

                {/* Navegação inferior padronizada */}
                <NavegacaoInferior navigation={navigation} ativa="Grafico" />
            </AreaDaTela>
            {consultaDiario && (
                <RegistrosDiario
                    key={`${idUsuario}:${consultaDiario.inicio}:${consultaDiario.fim}`}
                    periodo={consultaDiario}
                    onFechar={() => setConsultaDiario(null)}
                    onAbrirDiario={abrirDiario}
                />
            )}
        </LinearGradient>
    );
}
const styles = criarEstilos({
    diaryButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        backgroundColor: CORES.acento, minHeight: 46, padding: 12, borderRadius: 16, marginTop: 8 },
    diaryButtonText: { color: CORES.textoEscuro, fontSize: 14, fontWeight: '800' },
    diaryLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 44, marginTop: 8 },
    diaryLinkText: { color: '#D5FF73', fontSize: 13, fontWeight: '700' },
    dayDiary: { minHeight: 44, paddingHorizontal: 4 },
    dayDiaryLink: { color: '#D5FF73', textDecorationLine: 'underline' },
    container: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingBottom: 24,
    },
    introTitle: {
        fontSize: 23,
        fontWeight: '900',
        color: '#1D3507',
        marginTop: 4,
        marginBottom: 5,
    },
    introText: {
        fontSize: 13,
        lineHeight: 19,
        color: '#304B17',
        marginBottom: 16,
    },
    summaryRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 16,
    },
    summaryCard: {
        flex: 1,
        minHeight: 112,
        backgroundColor: '#254508',
        borderRadius: 18,
        paddingVertical: 12,
        paddingHorizontal: 7,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.14)',
    },
    summaryNumber: {
        color: '#FFF',
        fontSize: 16,
        lineHeight: 22,
        fontWeight: '900',
        marginTop: 7,
        marginBottom: 3,
        textAlign: 'center',
    },
    summaryLabel: {
        color: '#E0F0C0',
        fontSize: 10,
        lineHeight: 14,
        textAlign: 'center',
    },
    filterBox: {
        backgroundColor: CORES.textoEscuro,
        borderRadius: 24,
        padding: 13,
        marginBottom: 16,
    },
    filterTitleArea: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        paddingHorizontal: 5,
    },
    periodTitle: {
        color: '#D5FF73',
        fontSize: 17,
        fontWeight: '800',
        flex: 1,
        marginRight: 12,
    },
    periodNavigation: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    periodArrow: {
        padding: 10,
    },
    periodRange: {
        color: '#E0F0C0',
        fontSize: 11,
    },
    filterOptions: {
        flexDirection: 'row',
        gap: 7,
    },
    filterButton: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 9,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: 'rgba(213,255,115,0.35)',
    },
    filterButtonActive: {
        backgroundColor: CORES.selecao,
        borderColor: CORES.selecao,
    },
    filterButtonText: {
        color: '#E0F0C0',
        fontSize: 13,
        fontWeight: '700',
    },
    filterButtonTextActive: {
        color: '#162704',
    },
    card: {
        backgroundColor: '#203B07',
        borderRadius: 23,
        padding: 17,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.14)',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 3,
        },
        shadowOpacity: 0.18,
        shadowRadius: 5,
    },
    cardTitle: {
        color: '#D5FF73',
        fontSize: 18,
        fontWeight: '900',
        marginBottom: 5,
    },
    cardSubtitle: {
        color: 'rgba(255,255,255,0.72)',
        fontSize: 12,
        lineHeight: 18,
        marginBottom: 14,
    },
    pieArea: {
        alignItems: 'center',
    },
    pieWrapper: {
        width: 230,
        height: 230,
        alignItems: 'center',
        justifyContent: 'center',
    },
    pieEmpty: {
        width: 200,
        height: 200,
        borderRadius: 100,
        borderWidth: 2,
        borderColor: '#6D8D3D',
        backgroundColor: 'rgba(255,255,255,0.04)',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 25,
    },
    pieEmptyText: {
        color: '#E0F0C0',
        fontSize: 12,
        textAlign: 'center',
        marginTop: 10,
        lineHeight: 17,
    },
    legend: {
        width: '100%',
        marginTop: 5,
        gap: 11,
    },
    pieSelection: {
        color: '#E0F0C0',
        fontSize: 12,
        textAlign: 'center',
        marginBottom: 14,
    },
    legendRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    legendDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginRight: 9,
    },
    legendName: {
        flex: 1,
        color: '#FFF',
        fontSize: 13,
        fontWeight: '600',
    },
    legendValue: {
        color: '#E0F0C0',
        fontSize: 12,
        fontWeight: '700',
    },
    totalPill: {
        alignSelf: 'center',
        backgroundColor: 'rgba(213,255,115,0.13)',
        borderRadius: 20,
        paddingHorizontal: 14,
        paddingVertical: 8,
        marginTop: 16,
    },
    totalPillText: {
        color: '#D5FF73',
        fontSize: 12,
        fontWeight: '800',
    },
    adviceCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: '#8FBF53',
        borderRadius: 20,
        padding: 15,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.55)',
    },
    adviceIcon: {
        width: 43,
        height: 43,
        borderRadius: 22,
        backgroundColor: '#E6F5C6',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    adviceContent: {
        flex: 1,
    },
    adviceTitle: {
        color: '#183507',
        fontSize: 15,
        fontWeight: '900',
        marginBottom: 6,
    },
    adviceText: {
        color: '#203B12',
        fontSize: 12,
        lineHeight: 18,
    },
    emptyText: {
        color: '#FFF',
        textAlign: 'center',
        fontSize: 13,
        lineHeight: 19,
        marginVertical: 12,
    },
    timelineContainer: {
        paddingRight: 4,
        gap: 10,
    },
    dayCard: {
        width: 116,
        minHeight: 174,
        paddingVertical: 12,
        paddingHorizontal: 8,
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderRadius: 17,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
    },
    dayName: {
        fontSize: 13,
        fontWeight: '900',
        color: '#D5FF73',
    },
    dayDate: {
        fontSize: 11,
        color: 'rgba(255,255,255,0.65)',
        marginTop: 2,
        marginBottom: 10,
    },
    dayEmotionCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 1.5,
        justifyContent: 'center',
        alignItems: 'center',
    },
    dayEmotionTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: '#FFF',
        marginTop: 7,
        marginBottom: 12,
        textAlign: 'center',
        minHeight: 30,
    },
    dayDetail: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 5,
        gap: 4,
    },
    dayDetailText: {
        fontSize: 10,
        color: '#E0F0C0',
    },
    disclaimer: {
        color: '#304B17',
        fontSize: 11,
        lineHeight: 16,
        textAlign: 'center',
        paddingHorizontal: 8,
        marginBottom: 8,
    },
    errorCard: {
        backgroundColor: '#FFF1F0',
        padding: 12,
        borderRadius: 12,
        marginBottom: 12,
    },
    errorText: {
        color: '#922B21',
        fontSize: 13,
    },
    retryText: {
        color: '#922B21',
        fontWeight: '800',
        paddingVertical: 10,
    },
});
