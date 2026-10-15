import { criarEstilos } from '../theme/estilos';
import React, { useState, useEffect, useRef, useContext } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Animated,
    Easing,
    Alert,
    ActivityIndicator,
    Platform,
    ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
import { AuthContext } from '../contexts/AuthContext';

export default function LoginScreen({ navigation }) {
    const [email, setEmail] = useState('');
    const [senha, setSenha] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { login } = useContext(AuthContext);

    function mostrarErro(mensagem) {
        if (Platform.OS === 'web') window.alert(mensagem);
        else Alert.alert('Acesso', mensagem);
    }

    async function handleLogin() {
        if (isLoading) return;
        if (!email.trim() || !senha.trim()) {
            mostrarErro('Por favor, preencha seu e-mail e senha.');
            return;
        }
        setIsLoading(true);
        try {
            const { data } = await api.post('/login', { email: email.trim().toLowerCase(), senha });
            await login(data.usuario, data.token);
        } catch (error) {
            mostrarErro(error.response?.status === 401
                ? 'E-mail ou senha incorretos. Tente novamente.'
                : 'Não foi possível entrar. Verifique sua conexão e tente novamente.');
        } finally {
            setIsLoading(false);
        }
    }

    // Animações iguais às da Home
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

    return (
        <LinearGradient
            colors={['#bbff00', '#f0fcce', '#72a600']}
            style={styles.container}
        >
            <SafeAreaView style={styles.safeArea}>

                {/* TOPO */}
                <LinearGradient
                    colors={['#325709', '#274804']}
                    style={styles.headerBar}
                >
                    <View style={styles.headerLogo}>
                        <Ionicons
                            name="sunny"
                            size={28}
                            color="#bbff00"
                        />
                    </View>

                    <Text style={styles.headerTitle}>
                        Amparo
                    </Text>

                    <View style={styles.headerRight} />
                </LinearGradient>

                {/* ÁREA PRINCIPAL */}
                <ScrollView contentContainerStyle={styles.mainContent}>
                    <LinearGradient
                        colors={['#3A6B0A', '#234104', '#142702']}
                        style={styles.loginCard}
                    >

                        {/* SOL ANIMADO E SAUDAÇÃO */}
                        <View style={styles.logoContainer}>
                            <Animated.View
                                style={[
                                    styles.sunGlow,
                                    {
                                        opacity: sunGlow,
                                        transform: [{ scale: sunScale }],
                                    },
                                ]}
                            >
                                <View style={styles.sunInnerGlow}>
                                    <Ionicons
                                        name="sunny"
                                        size={96}
                                        color="#ffcc00"
                                    />
                                </View>
                            </Animated.View>

                            <Text style={styles.welcomeText}>
                                Bem-vindo
                            </Text>

                            <Text style={styles.subtitleText}>
                                Entre na sua conta
                            </Text>
                        </View>

                        {/* A respiração pode ser aberta sem validar uma conta na internet. */}
                        <TouchableOpacity
                            style={styles.calmaButton}
                            onPress={() => navigation.navigate('CalmaUrgente')}
                            accessibilityRole="button"
                            accessibilityLabel="Abrir Calma Urgente sem login"
                        >
                            <Ionicons name="leaf-outline" size={22} color="#BBFF00" />
                            <Text style={styles.calmaButtonText}>Calma Urgente</Text>
                        </TouchableOpacity>

                        {/* FORMULÁRIO */}
                        <View style={styles.formContainer}>

                            {/* EMAIL */}
                            <View style={styles.inputWrapper}>
                                <Ionicons
                                    name="mail-outline"
                                    size={22}
                                    color="#bbff00"
                                    style={styles.inputIcon}
                                />

                                <TextInput
                                    style={styles.input}
                                    placeholder="Email"
                                    placeholderTextColor="#AFC88A"
                                    value={email}
                                    onChangeText={setEmail}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    editable={!isLoading}
                                />
                            </View>

                            {/* SENHA */}
                            <View style={styles.inputWrapper}>
                                <Ionicons
                                    name="lock-closed-outline"
                                    size={22}
                                    color="#bbff00"
                                    style={styles.inputIcon}
                                />

                                <TextInput
                                    style={styles.input}
                                    placeholder="Senha"
                                    placeholderTextColor="#AFC88A"
                                    secureTextEntry
                                    value={senha}
                                    onChangeText={setSenha}
                                    editable={!isLoading}
                                />
                            </View>

                            {/* ESQUECEU A SENHA */}
                            <TouchableOpacity
                                style={styles.forgotButton}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.forgotText}>
                                    Esqueceu a senha?
                                </Text>
                            </TouchableOpacity>

                            {/* BOTÃO ENTRAR */}
                            <TouchableOpacity
                                style={[styles.loginButton, isLoading && { opacity: 0.7 }]}
                                onPress={handleLogin}
                                disabled={isLoading}
                                activeOpacity={0.8}
                            >
                                {isLoading ? <ActivityIndicator color="#274804" /> : (
                                    <Text style={styles.loginButtonText}>Entrar</Text>
                                )}

                                <Ionicons
                                    name="arrow-forward"
                                    size={21}
                                    color="#274804"
                                />
                            </TouchableOpacity>

                        </View>
                    </LinearGradient>
                </ScrollView>
            </SafeAreaView>
        </LinearGradient>
    );
}

const styles = criarEstilos({
    container: {
        flex: 1,
    },

    safeArea: {
        flex: 1,
    },

    // HEADER
    headerBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginHorizontal: 16,
        marginTop: 12,
        paddingHorizontal: 20,
        height: 64,
        borderRadius: 25,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 5,
    },

    headerLogo: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },

    headerTitle: {
        flex: 1,
        textAlign: 'center',
        color: '#FFF',
        fontSize: 21,
        fontWeight: '900',
        letterSpacing: 0.5,
    },

    headerRight: {
        width: 40,
    },

    // CONTEÚDO
    mainContent: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingHorizontal: 16,
        paddingVertical: 25,
    },

    // CARD
    loginCard: {
        width: '100%',
        borderRadius: 32,
        paddingHorizontal: 24,
        paddingVertical: 34,
        alignItems: 'center',
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

    // SOL ANIMADO IGUAL AO DA HOME
    logoContainer: {
        alignItems: 'center',
        marginBottom: 30,
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

    welcomeText: {
        color: '#bbff00',
        fontSize: 29,
        fontWeight: '900',
        textAlign: 'center',
        letterSpacing: 0.5,
    },

    subtitleText: {
        color: '#f0fcce',
        fontSize: 15,
        fontWeight: '500',
        marginTop: 7,
        textAlign: 'center',
    },

    // FORMULÁRIO
    formContainer: {
        width: '100%',
        alignItems: 'center',
    },

    inputWrapper: {
        width: '100%',
        height: 56,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
        borderRadius: 28,
        marginBottom: 15,
        paddingHorizontal: 17,
    },

    inputIcon: {
        marginRight: 10,
    },

    input: {
        flex: 1,
        height: '100%',
        color: '#FFF',
        fontSize: 16,
        paddingVertical: 0,
    },

    // ESQUECEU SENHA
    forgotButton: {
        alignSelf: 'flex-end',
        marginTop: 1,
        marginBottom: 25,
        paddingHorizontal: 5,
    },

    forgotText: {
        color: '#bbff00',
        fontSize: 14,
        fontWeight: '700',
    },

    calmaButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        minHeight: 48,
        paddingHorizontal: 20,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#BBFF00',
        borderRadius: 24,
    },

    calmaButtonText: {
        color: '#BBFF00',
        fontWeight: '700',
        fontSize: 16,
    },

    // BOTÃO ENTRAR
    loginButton: {
        width: '72%',
        minHeight: 55,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 9,
        backgroundColor: '#bbff00',
        borderRadius: 30,
        shadowColor: '#bbff00',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 6,
    },

    loginButtonText: {
        color: '#274804',
        fontSize: 18,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
});
