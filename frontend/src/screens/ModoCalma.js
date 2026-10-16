import { criarEstilos } from '../theme/estilos';
import { AreaDaTela, Cabecalho, NavegacaoInferior } from '../components/NavegacaoPadrao';
import { DEGRADES, MEDIDAS } from '../theme/tema';
import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
    View, Text, TouchableOpacity, Animated, Easing,
    AppState, AccessibilityInfo, ScrollView, Modal, FlatList, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import Svg, { Circle } from 'react-native-svg';
import { useIsFocused } from '@react-navigation/native';
import { AuthContext } from '../contexts/AuthContext';
import { criarCicloRespiracao, FASES_RESPIRACAO } from '../services/respiracao';
import { registrarCicloCalma, listarHistoricoLocalCalma, atualizarHistoricoCalma } from '../services/calma';

// O atributo de layout do Animated não pertence aos elementos SVG na web.
const CirculoProgresso = React.forwardRef((propriedades, referencia) => {
    const atributos = { ...propriedades };

    delete atributos.collapsable;

    return <Circle {...atributos} ref={referencia} />;
});
const CirculoAnimado = Animated.createAnimatedComponent(CirculoProgresso);
const CIRCUNFERENCIA = 2 * Math.PI * 114;

export default function ModoCalmaScreen({ navigation }) {
    const { usuario } = useContext(AuthContext);
    const idUsuario = usuario?.id_usuario;
    const focado = useIsFocused();
    const contaAtual = useRef(idUsuario);
    const montado = useRef(true);
    const progresso = useRef(new Animated.Value(0)).current;
    const identificadorTela = React.useId();
    const versaoTelaAtiva = useRef(0);
    const versaoConsulta = useRef(0);
    const [pausado, setPausado] = useState(false);
    const [appAtivo, setAppAtivo] = useState(!AppState.currentState || AppState.currentState === 'active');
    const [reduzirMovimento, setReduzirMovimento] = useState(false);
    const [historicoAberto, setHistoricoAberto] = useState(false);
    const [historico, setHistorico] = useState({ registros: [], pendentes: 0 });
    const [sincronizando, setSincronizando] = useState(false);
    const [mensagemHistorico, setMensagemHistorico] = useState('');
    const [estado, setEstado] = useState({
        indiceFase: 0, restanteMs: 4000, segundos: 4, progresso: 0,
        ciclosConcluidos: 0, emExecucao: false,
        versaoFase: 0,
    });

    contaAtual.current = idUsuario;

    function podeAtualizar(conta) {
        return montado.current && contaAtual.current === conta;
    }

    async function carregarHistorico(conta) {
        const consultaAtual = ++versaoConsulta.current;
        const consultaVigente = () => podeAtualizar(conta) && versaoConsulta.current === consultaAtual;

        try {
            const local = await listarHistoricoLocalCalma(conta);

            if (consultaVigente()) {
                setHistorico(local);
                setSincronizando(true);
            }

            const atualizado = await atualizarHistoricoCalma(conta);

            if (consultaVigente()) {
                setHistorico(atualizado);
                setMensagemHistorico('');
            }
        } catch {
            // A indisponibilidade da API não interrompe a respiração guiada.
            const local = await listarHistoricoLocalCalma(conta).catch(() => null);

            if (consultaVigente()) {
                if (local) {
                    setHistorico(local);
                }

                setMensagemHistorico(local
                    ? 'Não foi possível atualizar o histórico agora. Você pode continuar respirando.'
                    : 'Não foi possível acessar o histórico neste dispositivo.');
            }
        } finally {
            if (consultaVigente()) {
                setSincronizando(false);
            }
        }
    }

    const ciclo = useMemo(() => criarCicloRespiracao({
        aoAtualizar: (atualizado) => {
            if (podeAtualizar(idUsuario)) {
                setEstado(atualizado);
            }
        },
        aoConcluir: ({ concluido_em }) => {
            if (!idUsuario) {
                return;
            }

            // Guarda um ciclo inteiro no dispositivo antes de tentar enviar.
            registrarCicloCalma(idUsuario, concluido_em)
                .then(() => carregarHistorico(idUsuario))
                .catch(() => {
                    if (podeAtualizar(idUsuario)) {
                        setMensagemHistorico('Não foi possível guardar este ciclo no dispositivo.');
                    }
                });
        },
    }), [idUsuario]);

    const fase = FASES_RESPIRACAO[estado.indiceFase];
    const registrosHistorico = historico.registros.slice(0, 50);

    // A contagem de salvos acompanha os registros exibidos no histórico recente.
    const ciclosSalvos = registrosHistorico.filter((registro) => !registro.pendente).length;

    useEffect(() => {
        if (!estado.emExecucao) {
            return;
        }

        // Cada ativação possui sua tag para uma liberação atrasada não afetar a retomada.
        const tag = identificadorTela + ':' + ++versaoTelaAtiva.current;
        let encerrado = false;
        const liberar = () => deactivateKeepAwake(tag).catch(() => {});

        activateKeepAwakeAsync(tag).then(() => {
            if (encerrado) {
                liberar();
            }
        }).catch(() => {});

        return () => {
            encerrado = true;
            liberar();
        };
    }, [estado.emExecucao, identificadorTela]);

    useEffect(() => {
        // O live region atende Android/web; no iOS o VoiceOver recebe um anúncio explícito.
        if (Platform.OS === 'ios' && estado.emExecucao) {
            const atual = ciclo.obterEstado();

            AccessibilityInfo.announceForAccessibility(fase.titulo + '. ' + atual.segundos + ' segundos.');
        }
    }, [ciclo, estado.versaoFase, estado.emExecucao]);

    useEffect(() => {
        montado.current = true;
        setEstado(ciclo.obterEstado());

        return () => {
            montado.current = false;
            ciclo.destruir();
        };
    }, [ciclo]);

    useEffect(() => {
        let ativo = true;

        AccessibilityInfo.isReduceMotionEnabled().then((valor) => {
            if (ativo) {
                setReduzirMovimento(valor);
            }
        }).catch(() => {});

        const movimento = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduzirMovimento);
        const aplicativo = AppState.addEventListener('change', (valor) => {
            if (valor !== 'active') {
                ciclo.pausar();
            }

            setAppAtivo(valor === 'active');
        });

        return () => {
            ativo = false;
            movimento.remove();
            aplicativo.remove();
        };
    }, [ciclo]);

    useEffect(() => {
        if (focado && appAtivo && !pausado && !historicoAberto) {
            ciclo.iniciar();
        } else {
            ciclo.pausar();
        }

        return () => ciclo.pausar();
    }, [ciclo, focado, appAtivo, pausado, historicoAberto]);

    useEffect(() => {
        if (!idUsuario || !focado || !appAtivo) {
            return;
        }

        carregarHistorico(idUsuario);

        const intervalo = setInterval(() => carregarHistorico(idUsuario), 30000);

        return () => clearInterval(intervalo);
    }, [idUsuario, focado, appAtivo]);

    // O contador e o anel partem do mesmo tempo restante, inclusive após uma pausa.
    useEffect(() => {
        const atual = ciclo.obterEstado();

        progresso.stopAnimation();
        progresso.setValue(atual.progresso);

        if (!atual.emExecucao || reduzirMovimento) {
            return;
        }

        const animacao = Animated.timing(progresso, {
            toValue: 1,
            duration: atual.restanteMs,
            easing: Easing.linear,
            useNativeDriver: false,
        });

        animacao.start();

        return () => animacao.stop();
    }, [ciclo, estado.versaoFase, estado.emExecucao, progresso, reduzirMovimento,
        reduzirMovimento ? estado.restanteMs : null]);

    function alternarPausa() {
        if (!pausado) {
            ciclo.pausar();
            progresso.stopAnimation();
            progresso.setValue(ciclo.obterEstado().progresso);
        }

        setPausado((valor) => !valor);
    }

    function recomecarCiclo() {
        progresso.stopAnimation();
        ciclo.reiniciar();
        progresso.setValue(0);

        if (Platform.OS === 'ios' && pausado) {
            AccessibilityInfo.announceForAccessibility('Ciclo reiniciado. A respiração continua pausada.');
        }
    }

    const escala = progresso.interpolate({
        inputRange: [0, 1],
        outputRange: [0.86 + fase.inicio * 0.14, 0.86 + fase.fim * 0.14],
    });
    const deslocamentoAnel = progresso.interpolate({
        inputRange: [0, 1],
        outputRange: [CIRCUNFERENCIA * (1 - fase.inicio), CIRCUNFERENCIA * (1 - fase.fim)],
    });

    return (
        <LinearGradient colors={DEGRADES.fundo} style={styles.container}>
            <AreaDaTela>
                <Cabecalho
                    titulo="Modo calma urgente"
                    navigation={navigation}
                    mostrarPerfil={!!idUsuario}
                    onVoltar={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate(idUsuario ? 'Home' : 'Login')}
                />

                <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                    <LinearGradient colors={['#3A6B0A', '#234104', '#142702']} style={styles.mainCard}>
                        <Ionicons name="leaf-outline" size={36} color="#BBFF00" />
                        <Text style={styles.cardTitle}>Modo Calma Urgente</Text>
                        <Text style={styles.cardSubtitle}>Um momento para desacelerar</Text>

                        <View style={styles.breathingArea}>
                            <Svg width={245} height={245} style={styles.ring} aria-hidden={true}>
                                <Circle cx={122.5} cy={122.5} r={114} stroke="rgba(187,255,0,0.2)" strokeWidth={4} fill="none" />
                                <CirculoAnimado
                                    cx={122.5} cy={122.5} r={114}
                                    stroke="#BBFF00" strokeWidth={4} fill="none"
                                    strokeDasharray={[CIRCUNFERENCIA, CIRCUNFERENCIA]}
                                    strokeDashoffset={deslocamentoAnel}
                                    transform="rotate(-90 122.5 122.5)"
                                />
                            </Svg>

                            <Animated.View style={[
                                styles.breathingCircle,
                                !reduzirMovimento && { transform: [{ scale: escala }] },
                            ]}>
                                <Text style={styles.phaseText} accessibilityLiveRegion="polite">{fase.titulo}</Text>
                                <Text style={styles.numberText}>{estado.segundos}</Text>
                                <Text style={styles.secondsText}>{estado.segundos === 1 ? 'segundo' : 'segundos'}</Text>
                            </Animated.View>
                        </View>

                        <Text style={styles.supportText}>Respire, você está seguro.</Text>
                        <Text style={styles.instruction}>{fase.instrucao}</Text>

                        <View style={styles.breathingControls}>
                            <TouchableOpacity
                                style={[styles.pauseButton, styles.breathingPauseButton]} onPress={alternarPausa}
                                accessibilityRole="button"
                                accessibilityLabel={pausado ? 'Continuar respiração' : 'Pausar respiração'}
                            >
                                <View style={styles.pauseIconCircle}>
                                    <Ionicons name={pausado ? 'play' : 'pause'} size={17} color="#FFF" />
                                </View>

                                <Text style={styles.pauseText}>{pausado ? 'Continuar' : 'Pausar'}</Text>
                            </TouchableOpacity>

                            {/* O botão usa somente um ícone e mantém sua descrição para leitores de tela. */}
                            <TouchableOpacity
                                style={styles.restartButton} onPress={recomecarCiclo} activeOpacity={0.7}
                                accessibilityRole="button" accessibilityLabel="Recomeçar ciclo de respiração"
                                accessibilityHint="Reinicia o ciclo atual e mantém os ciclos concluídos e o estado de pausa."
                            >
                                <Ionicons name="refresh-outline" size={24} color="#BBFF00" accessible={false} />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.bottomHint}>
                            Não precisa respirar fundo nem seguir perfeitamente o ritmo. Respeite o que for confortável para você.
                        </Text>
                        <TouchableOpacity
                            style={styles.historyButton}
                            onPress={() => idUsuario ? setHistoricoAberto(true) : navigation.navigate('Login')}
                            accessibilityRole="button"
                            accessibilityLabel={idUsuario ? 'Ver histórico de calma' : 'Entrar para salvar seus ciclos'}
                        >
                            <Ionicons name="time-outline" size={18} color="#BBFF00" />
                            <Text style={styles.historyButtonText}>{idUsuario ? 'Ver histórico' : 'Entrar para salvar seus ciclos'}</Text>
                        </TouchableOpacity>

                        {!!mensagemHistorico && <Text style={styles.bottomHint}>{mensagemHistorico}</Text>}
                    </LinearGradient>
                </ScrollView>

                {idUsuario ? (
                    <NavegacaoInferior navigation={navigation} ativa="ModoCalma" />
                ) : (
                    <LinearGradient colors={DEGRADES.navegacao} style={styles.floatingBottomNav}>
                        <TouchableOpacity
                            style={styles.navItem} onPress={() => navigation.navigate('Login')}
                            accessibilityRole="button" accessibilityLabel="Voltar ao acesso"
                        >
                            <Text style={styles.historyButtonText}>Voltar ao acesso</Text>
                        </TouchableOpacity>
                    </LinearGradient>
                )}

                <Modal
                    visible={historicoAberto} transparent animationType={reduzirMovimento ? 'none' : 'fade'}
                    onRequestClose={() => setHistoricoAberto(false)}
                >
                    <View style={styles.modalBackdrop}>
                        <View style={styles.historyCard} accessibilityViewIsModal>
                            <View style={styles.historyHeader}>
                                <Text style={[styles.cardTitle, styles.historyTitle]}>Histórico de calma</Text>
                                <TouchableOpacity
                                    onPress={() => setHistoricoAberto(false)} style={styles.headerSide}
                                    accessibilityRole="button" accessibilityLabel="Fechar histórico"
                                >
                                    <Ionicons name="close" size={25} color="#BBFF00" />
                                </TouchableOpacity>
                            </View>

                            <Text style={styles.cardSubtitle}>Seus ciclos mais recentes · até 50 registros</Text>

                            <View style={styles.historySummary}>
                                <View style={styles.historySummaryItem}>
                                    <Text style={styles.historySummaryValue}>{estado.ciclosConcluidos}</Text>
                                    <Text style={styles.historySummaryLabel}>Concluídos nesta visita</Text>
                                </View>

                                <View style={styles.historySummaryItem}>
                                    <Text style={styles.historySummaryValue}>{ciclosSalvos}</Text>
                                    <Text style={styles.historySummaryLabel}>Salvos neste histórico</Text>
                                </View>
                            </View>

                            {historico.pendentes > 0 && (
                                <Text style={styles.historyPending}>
                                    {historico.pendentes} {historico.pendentes === 1 ? 'ciclo salvo' : 'ciclos salvos'} no dispositivo, aguardando envio.
                                </Text>
                            )}

                            <FlatList
                                data={registrosHistorico} keyExtractor={(item) => item.id_cliente}
                                ListEmptyComponent={<Text style={styles.emptyHistory}>Ao concluir um ciclo, ele aparecerá aqui.</Text>}
                                renderItem={({ item }) => (
                                    <View style={styles.historyRow}>
                                        <Ionicons name="checkmark-circle-outline" size={24} color="#BBFF00" />
                                        <View style={styles.historyDetails}>
                                            <Text style={styles.historyDate}>
                                                {new Date(item.concluido_em).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                                            </Text>
                                            <Text style={styles.historyStatus}>
                                                {item.duracao_segundos} segundos · {item.pendente ? 'Aguardando envio' : 'Salvo na sua conta'}
                                            </Text>
                                        </View>
                                    </View>
                                )}
                            />

                            {!!mensagemHistorico && <Text style={styles.bottomHint}>{mensagemHistorico}</Text>}
                            <TouchableOpacity
                                style={styles.pauseButton} disabled={sincronizando} onPress={() => carregarHistorico(idUsuario)}
                                accessibilityRole="button" accessibilityState={{ disabled: sincronizando }}
                            >
                                <Text style={styles.pauseText}>{sincronizando ? 'Atualizando…' : 'Atualizar histórico'}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>
            </AreaDaTela>
        </LinearGradient>
    );
}

const styles = criarEstilos({
    container: {
        flex: 1,
    },

    scroll: {
        flex: 1,
        minHeight: 0,
    },

    headerSide: {
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },

    content: {
        flexGrow: 1,
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 8,
        justifyContent: 'center',
    },

    mainCard: {
        width: '100%',
        borderRadius: 30,
        paddingHorizontal: 18,
        paddingVertical: 22,
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: 'rgba(187,255,0,0.3)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 10,
    },

    breathingIcon: {
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 5,
    },

    cardTitle: {
        color: '#BBFF00',
        fontSize: 23,
        fontWeight: '900',
        textAlign: 'center',
        letterSpacing: 0.3,
        marginBottom: 3,
    },

    cardSubtitle: {
        color: '#E0F0C0',
        fontSize: 13,
        fontWeight: '500',
        textAlign: 'center',
        marginBottom: 8,
    },

    breathingArea: {
        width: 245,
        height: 245,
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 2,
    },

    outerCircle: {
        position: 'absolute',
        width: 232,
        height: 232,
        borderRadius: 116,
        borderWidth: 3,
        borderColor: '#BBFF00',
    },

    middleCircle: {
        position: 'absolute',
        width: 214,
        height: 214,
        borderRadius: 107,
        borderWidth: 1,
        borderColor: 'rgba(187,255,0,0.28)',
    },

    breathingCircle: {
        width: 188,
        height: 188,
        borderRadius: 94,
        backgroundColor: '#2B7607',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: '#4B980F',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 8,
    },

    phaseText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '700',
    },

    numberText: {
        color: '#FFF',
        fontSize: 58,
        lineHeight: 62,
        fontWeight: '300',
        marginVertical: -2,
    },

    secondsText: {
        color: '#FFF',
        fontSize: 15,
        fontWeight: '700',
    },

    instruction: {
        color: '#E0F0C0',
        fontSize: 14,
        fontWeight: '600',
        textAlign: 'center',
        marginTop: 10,
        paddingHorizontal: 8,
        lineHeight: 20,
    },

    breathingControls: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        marginTop: 20,
    },

    breathingPauseButton: {
        marginTop: 0,
    },

    restartButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(187,255,0,0.1)',
        borderWidth: 1.5,
        borderColor: 'rgba(187,255,0,0.55)',
        shadowColor: '#BBFF00',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        elevation: 3,
    },

    pauseButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#BBFF00',
        borderRadius: 28,
        minHeight: 48,
        paddingHorizontal: 10,
        paddingRight: 20,
        marginTop: 12,
        shadowColor: '#BBFF00',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 7,
        elevation: 5,
    },

    pauseIconCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#274804',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 8,
    },

    pauseText: {
        color: '#274804',
        fontSize: 16,
        fontWeight: '900',
    },

    bottomHint: {
        color: 'rgba(224,240,192,0.75)',
        fontSize: 11,
        lineHeight: 16,
        fontWeight: '500',
        marginTop: 18,
        textAlign: 'center',
    },

    floatingBottomNav: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        height: MEDIDAS.alturaBarra,
        minHeight: MEDIDAS.alturaBarra,
        maxHeight: MEDIDAS.alturaBarra,
        flexShrink: 0,
        marginHorizontal: MEDIDAS.margemHorizontal,
        marginTop: 8,
        marginBottom: 8,
        borderRadius: MEDIDAS.alturaBarra / 2,
        paddingHorizontal: 8,
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
    },

    navItem: {
        flex: 1,
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },

    ring: { position: 'absolute' },

    supportText: { color: '#FFF', fontSize: 16, fontWeight: '700', textAlign: 'center', marginTop: 16 },

    historySummary: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 8,
        marginBottom: 12,
    },

    historySummaryItem: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 8,
        paddingVertical: 12,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(187,255,0,0.25)',
        backgroundColor: 'rgba(187,255,0,0.08)',
    },

    historySummaryValue: {
        color: '#BBFF00',
        fontSize: 28,
        fontWeight: '800',
        marginBottom: 4,
    },

    historySummaryLabel: {
        color: '#E0F0C0',
        fontSize: 12,
        textAlign: 'center',
        lineHeight: 17,
    },

    historyPending: {
        color: '#E0F0C0',
        fontSize: 12,
        lineHeight: 18,
        textAlign: 'center',
        marginBottom: 12,
    },

    historyButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', minHeight: 44, marginTop: 10, gap: 8 },

    historyButtonText: { color: '#BBFF00', fontSize: 14, fontWeight: '700' },

    modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', alignItems: 'center', padding: 20 },

    historyCard: { width: '100%', maxWidth: 520, maxHeight: '80%', padding: 20, backgroundColor: '#234104', borderRadius: 25 },

    historyHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

    historyTitle: { flex: 1, fontSize: 20, textAlign: 'left' },

    historyRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderColor: 'rgba(187,255,0,0.2)' },

    historyDetails: { flex: 1, marginLeft: 10 },

    historyDate: { color: '#FFF', fontSize: 14, marginBottom: 4 },

    historyStatus: { color: '#E0F0C0', fontSize: 12 },

    emptyHistory: { color: '#E0F0C0', textAlign: 'center', paddingVertical: 24 },
});
