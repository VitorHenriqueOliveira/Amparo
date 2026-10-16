import { criarEstilos } from '../theme/estilos';
import { AreaDaTela, Cabecalho } from '../components/NavegacaoPadrao';
import ConteudoAjustavel from '../components/ConteudoAjustavel';
import { CORES, DEGRADES } from '../theme/tema';
import { useEffect, useRef } from 'react';
import { Platform, View, Text, TouchableOpacity, Animated, Easing, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
export default function HomeScreen({ navigation }) {
    const { height } = useWindowDimensions();
    const compacto = height < 760;
    const sunScale = useRef(new Animated.Value(1)).current;
    const sunGlow = useRef(new Animated.Value(0.55)).current;
    useEffect(() => {
        const animation = Animated.loop(
            Animated.parallel([
                Animated.sequence([
                    Animated.timing(sunScale, {
                        toValue: 1.12,
                        duration: 1500,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: Platform.OS !== 'web',
                    }),
                    Animated.timing(sunScale, {
                        toValue: 1,
                        duration: 1500,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: Platform.OS !== 'web',
                    }),
                ]),
                Animated.sequence([
                    Animated.timing(sunGlow, {
                        toValue: 1,
                        duration: 1500,
                        useNativeDriver: Platform.OS !== 'web',
                    }),
                    Animated.timing(sunGlow, {
                        toValue: 0.55,
                        duration: 1500,
                        useNativeDriver: Platform.OS !== 'web',
                    }),
                ]),
            ])
        );
        animation.start();
        return () => animation.stop();
    }, [sunScale, sunGlow]);
    const menuItems = [
        {
            title: 'Diário Emocional',
            subtitle: 'Escreva sobre seu dia',
            icon: 'book-outline',
            route: 'Diario',
        },
        {
            title: 'Registro Emocional',
            subtitle: 'Como você se sente?',
            icon: 'happy-outline',
            route: 'Emocao',
        },
        {
            title: 'Registro de Sono',
            subtitle: 'Acompanhe seu descanso',
            icon: 'moon-outline',
            route: 'Sono',
        },
        {
            title: 'Evolução Emocional',
            subtitle: 'Veja suas emoções',
            icon: 'trending-up-outline',
            route: 'Grafico',
        },
        {
            title: 'Modo Calma Urgente',
            subtitle: 'Respire e desacelere',
            icon: 'heart-outline',
            route: 'ModoCalma',
        },
    ];
    return (
        <LinearGradient colors={DEGRADES.fundo} style={styles.container}>
            <AreaDaTela>
                {/* CABEÇALHO */}
                <Cabecalho titulo="Amparo" navigation={navigation} marca />

                {/* CONTEÚDO PRINCIPAL */}
                <ConteudoAjustavel contentContainerStyle={styles.mainContent}>
                    <LinearGradient colors={DEGRADES.cartao} style={[styles.mainCard, compacto && styles.mainCardCompacto]}>
                        {/* SOL ANIMADO E SAUDAÇÃO */}
                        <View style={[styles.logoContainer, compacto && styles.logoContainerCompacto]}>
                            <Animated.View
                                style={[
                                    styles.sunGlow,
                                    compacto && styles.sunGlowCompacto,
                                    {
                                        opacity: sunGlow,
                                        transform: [
                                            {
                                                scale: sunScale,
                                            },
                                        ],
                                    },
                                ]}
                            >
                                <View style={[styles.sunInnerGlow, compacto && styles.sunInnerGlowCompacto]}>
                                    <Ionicons name="sunny" size={compacto ? 64 : 96} color="#ffcc00" />
                                </View>
                            </Animated.View>

                            <View style={styles.saudacao}>
                                <Text style={[styles.title, compacto && styles.textoCompacto]}>Como você está?</Text>

                                <Text style={[styles.subtitle, compacto && styles.textoCompacto]}>Cuide de você hoje.</Text>
                            </View>
                        </View>

                        {/* BOTÕES DO MENU */}
                        <View style={styles.buttonsContainer}>
                            {menuItems.map((item) => (
                                <TouchableOpacity
                                    key={item.route}
                                    style={styles.menuButton}
                                    onPress={() => navigation.navigate(item.route)}
                                    activeOpacity={0.78}
                                    accessibilityRole="button"
                                    accessibilityLabel={item.title}
                                >
                                    <View style={styles.buttonIcon}>
                                        <Ionicons name={item.icon} size={25} color={CORES.acento} />
                                    </View>

                                    <View style={styles.buttonTextContainer}>
                                        <Text style={styles.buttonTitle}>{item.title}</Text>

                                        <Text style={styles.buttonSubtitle}>{item.subtitle}</Text>
                                    </View>

                                    <Ionicons name="chevron-forward" size={22} color="#AFC88A" />
                                </TouchableOpacity>
                            ))}
                        </View>
                    </LinearGradient>
                </ConteudoAjustavel>
            </AreaDaTela>
        </LinearGradient>
    );
}
const styles = criarEstilos({
    container: {
        flex: 1,
    },
    // CABEÇALHO

    // CONTEÚDO
    mainContent: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    // CARD PRINCIPAL
    mainCard: {
        width: '100%',
        borderRadius: 32,
        paddingHorizontal: 16,
        paddingVertical: 18,
        borderWidth: 1.5,
        borderColor: 'rgba(187,255,0,0.3)',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 10,
        },
        shadowOpacity: 0.35,
        shadowRadius: 12,
        elevation: 12,
    },
    mainCardCompacto: {
        paddingVertical: 12,
    },
    // SOL E SAUDAÇÃO
    logoContainer: {
        alignItems: 'center',
        marginBottom: 16,
    },
    logoContainerCompacto: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 16,
    },
    saudacao: {
        flexShrink: 1,
    },
    textoCompacto: {
        textAlign: 'left',
    },
    sunGlowCompacto: {
        width: 84,
        height: 84,
        borderRadius: 42,
        marginBottom: 0,
    },
    sunInnerGlowCompacto: {
        width: 76,
        height: 76,
        borderRadius: 38,
    },
    sunGlow: {
        width: 126,
        height: 126,
        borderRadius: 63,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
        backgroundColor: 'rgba(255,216,61,0.10)',
        shadowColor: '#fecb00',
        shadowOffset: {
            width: 0,
            height: 0,
        },
        shadowOpacity: 1,
        shadowRadius: 22,
        elevation: 12,
    },
    sunInnerGlow: {
        width: 112,
        height: 112,
        borderRadius: 56,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,216,61,0.08)',
    },
    title: {
        color: CORES.acento,
        fontSize: 27,
        fontWeight: '900',
        textAlign: 'center',
        letterSpacing: 0.4,
    },
    subtitle: {
        color: CORES.textoSuave,
        fontSize: 14,
        fontWeight: '500',
        marginTop: 6,
        textAlign: 'center',
    },
    // BOTÕES
    buttonsContainer: {
        width: '100%',
        gap: 8,
    },
    menuButton: {
        width: '100%',
        minHeight: 64,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.10)',
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    buttonIcon: {
        width: 45,
        height: 45,
        borderRadius: 15,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(187,255,0,0.10)',
        borderWidth: 1,
        borderColor: 'rgba(187,255,0,0.35)',
        marginRight: 12,
    },
    buttonTextContainer: {
        flex: 1,
    },
    buttonTitle: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '800',
    },
    buttonSubtitle: {
        color: '#AFC88A',
        fontSize: 13,
        marginTop: 3,
    },
});
