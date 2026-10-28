import { criarEstilos } from '../theme/estilos';
import { AreaDaTela, Cabecalho, NavegacaoInferior } from '../components/NavegacaoPadrao';
import { CORES, DEGRADES } from '../theme/tema';
import { useEffect, useRef, useState } from 'react';
import { Platform, View, Text, TouchableOpacity, ScrollView, Animated, Easing, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { adicionarEmocao, criarIdConfirmacao } from '../services/emocoes';
import { mensagemFalhaConexao } from '../services/api';
const CONFIRMATION_DURATION = 1100;
const EMOTIONS = {
    feliz: {
        id: 'feliz',
        title: 'Feliz',
        icon: 'sunny',
        color: '#f5c000',
        words: 'Alegre, Contente, Eufórico, Animado, Satisfeito, Realizado, Tranquilo, Risonho, Feliz.',
    },
    triste: {
        id: 'triste',
        title: 'Triste',
        icon: 'cloud-outline',
        color: '#0068e6',
        words: 'Solidão, Desânimo, Melancolia, Frustração, Culpa, Luto, Desolado, Emotivo, Infeliz, Angustiado, Desespero.',
    },
    neutro: {
        id: 'neutro',
        title: 'Neutro',
        icon: 'moon',
        color: '#005197',
        words: 'Imparcial, Indefinido, Insensível, Indiferente, Distante.',
    },
    raiva: {
        id: 'raiva',
        title: 'Raiva',
        icon: 'thunderstorm',
        color: '#b31f1c',
        words: 'Ódio, Irritação, Indignação, Rancor, Repulsa, Impaciente, Nervoso, Ansioso, Aborrecido.',
    },
};
export default function EmocaoScreen({ navigation }) {
    const [selectedEmotionKey, setSelectedEmotionKey] = useState(null);
    const [saving, setSaving] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [confirmation, setConfirmation] = useState(0);
    const savingRef = useRef(false);
    const pendingConfirmation = useRef(null);
    const iconPulse = useRef(new Animated.Value(1)).current;
    const confirmationProgress = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        if (!confirmation) return;
        confirmationProgress.setValue(0);

        // A subida, a chacoalhada e a saída cabem no mesmo intervalo de 1,1 segundo.
        const animation = Animated.timing(confirmationProgress, {
            toValue: 1,
            duration: CONFIRMATION_DURATION,
            easing: Easing.linear,
            useNativeDriver: Platform.OS !== 'web',
            isInteraction: false,
        });
        animation.start(({ finished }) => {
            if (finished) setConfirmation(0);
        });
        return () => animation.stop();
    }, [confirmation, confirmationProgress]);
    useEffect(() => {
        const animation = Animated.loop(
            Animated.sequence([
                Animated.timing(iconPulse, {
                    toValue: 1.06,
                    duration: 1400,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: Platform.OS !== 'web',
                }),
                Animated.timing(iconPulse, {
                    toValue: 1,
                    duration: 1400,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: Platform.OS !== 'web',
                }),
            ])
        );
        animation.start();
        return () => animation.stop();
    }, [iconPulse]);
    const selectedEmotion = selectedEmotionKey ? EMOTIONS[selectedEmotionKey] : null;
    const handleConfirm = async () => {
        // Bloqueia toques repetidos mesmo antes da próxima renderização.
        if (!selectedEmotion || savingRef.current) return;
        savingRef.current = true;
        setSaving(true);
        setErrorMessage('');
        try {
            if (pendingConfirmation.current?.emotionKey !== selectedEmotion.id) {
                pendingConfirmation.current = {
                    emotionKey: selectedEmotion.id,
                    idCliente: criarIdConfirmacao(),
                };
            }
            await adicionarEmocao(selectedEmotion.id, pendingConfirmation.current.idCliente);
            pendingConfirmation.current = null;
            setSelectedEmotionKey(null);
            setConfirmation((current) => current + 1);
        } catch (erro) {
            setErrorMessage(mensagemFalhaConexao(erro, 'Não foi possível salvar a emoção. Tente novamente.'));
        } finally {
            savingRef.current = false;
            setSaving(false);
        }
    };
    const handleDismiss = () => {
        if (savingRef.current) return;
        setSelectedEmotionKey(null);
        setErrorMessage('');
        pendingConfirmation.current = null;
    };
    const handleNavigation = (route) => {
        navigation.navigate(route);
    };
    return (
        <LinearGradient colors={DEGRADES.fundo} style={styles.container}>
            <AreaDaTela>
                <Cabecalho titulo="Registro Emocional" navigation={navigation} />

                <View style={styles.contentArea}>
                    <LinearGradient colors={DEGRADES.cartao} style={styles.mainCardContainer}>
                        <ScrollView
                            style={styles.cardScroll}
                            contentContainerStyle={styles.cardScrollContent}
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
                        >
                            <Text style={styles.cardQuestion}>Como se sente hoje?</Text>

                            <View style={styles.gridContainer}>
                                {Object.values(EMOTIONS).map((item) => (
                                    <TouchableOpacity
                                        key={item.id}
                                        style={styles.gridItem}
                                        onPress={() => setSelectedEmotionKey(item.id)}
                                        activeOpacity={0.75}
                                        accessibilityRole="button"
                                        accessibilityLabel={`Selecionar emoção ${item.title}`}
                                    >
                                        <Animated.View
                                            style={[
                                                styles.emotionIconMotion,
                                                {
                                                    transform: [
                                                        {
                                                            scale: iconPulse,
                                                        },
                                                    ],
                                                },
                                            ]}
                                        >
                                            <Ionicons name={item.icon} size={72} color={item.color} />
                                        </Animated.View>

                                        <Text style={styles.gridItemText}>{item.title}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </ScrollView>

                        {confirmation > 0 && (
                            <Animated.View
                                accessible
                                accessibilityRole="alert"
                                accessibilityLabel="Sentimento registrado com sucesso"
                                accessibilityLiveRegion="polite"
                                style={[
                                    styles.confirmation,
                                    {
                                        opacity: confirmationProgress.interpolate({
                                            inputRange: [0, 0.12, 0.8, 1],
                                            outputRange: [0, 1, 1, 0],
                                        }),
                                        transform: [
                                            {
                                                translateY: confirmationProgress.interpolate({
                                                    inputRange: [0, 0.18, 0.8, 1],
                                                    outputRange: [18, 0, -12, -28],
                                                }),
                                            },
                                            {
                                                rotate: confirmationProgress.interpolate({
                                                    inputRange: [0, 0.18, 0.28, 0.38, 0.48, 0.58, 0.7, 1],
                                                    outputRange: [
                                                        '0deg',
                                                        '0deg',
                                                        '-2deg',
                                                        '2deg',
                                                        '-1.5deg',
                                                        '1deg',
                                                        '0deg',
                                                        '0deg',
                                                    ],
                                                }),
                                            },
                                            {
                                                scale: confirmationProgress.interpolate({
                                                    inputRange: [0, 0.14, 0.24, 0.8, 1],
                                                    outputRange: [0.92, 1.03, 1, 1, 0.98],
                                                }),
                                            },
                                        ],
                                    },
                                ]}
                            >
                                <LinearGradient
                                    colors={['#F2FFDB', '#D9F5AC']}
                                    start={{
                                        x: 0,
                                        y: 0,
                                    }}
                                    end={{
                                        x: 1,
                                        y: 1,
                                    }}
                                    style={styles.confirmationSurface}
                                >
                                    <View style={styles.confirmationIcon}>
                                        <Ionicons name="checkmark" size={20} color={CORES.acento} />
                                    </View>

                                    <View style={styles.confirmationContent}>
                                        <Text style={styles.confirmationTitle}>Registrado!</Text>
                                        <Text style={styles.confirmationText}>Seu sentimento foi salvo</Text>
                                    </View>
                                </LinearGradient>
                            </Animated.View>
                        )}
                    </LinearGradient>
                </View>

                <Modal
                    visible={Boolean(selectedEmotion)}
                    transparent
                    animationType={confirmation > 0 ? 'none' : 'fade'}
                    onRequestClose={handleDismiss}
                >
                    <SafeAreaView style={styles.modalOverlay}>
                        <LinearGradient colors={DEGRADES.cartao} style={styles.modalCard}>
                            <ScrollView contentContainerStyle={styles.modalContent}>
                                {selectedEmotion && (
                                    <View style={styles.detailContainer}>
                                        <Animated.View
                                            style={{
                                                transform: [
                                                    {
                                                        scale: iconPulse,
                                                    },
                                                ],
                                                marginBottom: 16,
                                            }}
                                        >
                                            <Ionicons
                                                name={selectedEmotion.icon}
                                                size={100}
                                                color={selectedEmotion.color}
                                            />
                                        </Animated.View>

                                        <Text style={styles.detailTitle}>{selectedEmotion.title}</Text>

                                        <Text style={styles.detailWords}>{selectedEmotion.words}</Text>

                                        {errorMessage ? (
                                            <Text
                                                style={styles.errorText}
                                                accessibilityRole="alert"
                                                accessibilityLiveRegion="polite"
                                            >
                                                {errorMessage}
                                            </Text>
                                        ) : null}

                                        <TouchableOpacity
                                            style={[styles.doneButton, saving && styles.doneButtonDisabled]}
                                            onPress={handleConfirm}
                                            disabled={saving}
                                            accessibilityState={{
                                                disabled: saving,
                                                busy: saving,
                                            }}
                                            activeOpacity={0.8}
                                            accessibilityRole="button"
                                            accessibilityLabel="Salvar sentimento"
                                        >
                                            <Text style={styles.doneButtonText}>
                                                {saving ? 'Salvando...' : 'Feito!'}
                                            </Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={styles.backButton}
                                            onPress={handleDismiss}
                                            disabled={saving}
                                            activeOpacity={0.8}
                                            accessibilityRole="button"
                                            accessibilityLabel="Mudar sentimento"
                                        >
                                            <Text style={styles.backButtonText}>Mudar sentimento</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </ScrollView>
                        </LinearGradient>
                    </SafeAreaView>
                </Modal>

                <NavegacaoInferior navigation={navigation} ativa="Emocao" />
            </AreaDaTela>
        </LinearGradient>
    );
}
const styles = criarEstilos({
    container: {
        flex: 1,
    },
    contentArea: {
        flex: 1,
    },
    mainCardContainer: {
        flex: 1,
        borderRadius: 28,
        marginHorizontal: 16,
        marginBottom: 10,
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.25,
        shadowRadius: 6,
    },
    cardScroll: {
        flex: 1,
    },
    cardScrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingVertical: 8,
    },
    cardQuestion: {
        fontSize: 24,
        fontWeight: '900',
        color: CORES.acento,
        marginBottom: 24,
        textAlign: 'center',
        letterSpacing: 0.5,
    },
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        width: '100%',
    },
    gridItem: {
        width: '48%',
        minHeight: 140,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        paddingHorizontal: 6,
        marginBottom: 12,
        backgroundColor: 'rgba(255,255,255,0.045)',
        borderRadius: 22,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
    },
    emotionIconMotion: {
        minHeight: 82,
        justifyContent: 'center',
        alignItems: 'center',
    },
    gridItemText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '800',
        marginTop: 10,
        textAlign: 'center',
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: 'rgba(0,0,0,0.65)',
    },
    modalCard: {
        width: '100%',
        maxWidth: 480,
        maxHeight: '90%',
        borderRadius: 28,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
        overflow: 'hidden',
    },
    modalContent: {
        padding: 24,
    },
    errorText: {
        color: '#FFD8D3',
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 16,
    },
    confirmation: {
        pointerEvents: 'none',
        position: 'absolute',
        top: 40,
        right: 20,
        maxWidth: '88%',
        zIndex: 10,
        borderRadius: 24,
        elevation: 8,
        shadowColor: '#0D2103',
        shadowOffset: {
            width: 0,
            height: 6,
        },
        shadowOpacity: 0.24,
        shadowRadius: 12,
    },
    confirmationSurface: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 12,
        paddingLeft: 12,
        paddingRight: 18,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.7)',
    },
    confirmationIcon: {
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#274804',
    },
    confirmationContent: {
        flexShrink: 1,
        gap: 2,
    },
    confirmationTitle: {
        color: '#213D08',
        fontSize: 15,
        fontWeight: '900',
        letterSpacing: 0.2,
    },
    confirmationText: {
        color: '#496127',
        fontSize: 11,
        fontWeight: '500',
    },
    detailContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        paddingHorizontal: 6,
        paddingVertical: 12,
    },
    detailTitle: {
        fontSize: 28,
        fontWeight: '900',
        color: CORES.acento,
        marginBottom: 12,
        letterSpacing: 1,
        textAlign: 'center',
    },
    detailWords: {
        color: CORES.textoSuave,
        fontSize: 15,
        textAlign: 'center',
        lineHeight: 24,
        paddingHorizontal: 10,
        marginBottom: 26,
        fontWeight: '500',
    },
    doneButton: {
        backgroundColor: CORES.selecao,
        paddingVertical: 14,
        paddingHorizontal: 60,
        borderRadius: 30,
        shadowColor: CORES.selecao,
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
        marginBottom: 12,
    },
    doneButtonDisabled: {
        opacity: 0.6,
    },
    doneButtonText: {
        color: '#274804',
        fontSize: 18,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    backButton: {
        paddingVertical: 10,
        paddingHorizontal: 20,
    },
    backButtonText: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 14,
        fontWeight: '600',
        textDecorationLine: 'underline',
    },
});
