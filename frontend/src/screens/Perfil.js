import { criarEstilos } from '../theme/estilos';
import { AreaDaTela, Cabecalho, NavegacaoInferior } from '../components/NavegacaoPadrao';
import { CORES, DEGRADES } from '../theme/tema';
import { useState, useContext, useCallback, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
    View,
    Text,
    StatusBar,
    ScrollView,
    TouchableOpacity,
    Switch,
    Modal,
    TextInput,
    Alert,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../contexts/AuthContext';
export default function Perfil({ navigation }) {
    const { usuario, logout, atualizarNome, recarregarPerfil, salvarNotificacoes } = useContext(AuthContext);
    const nome = usuario?.nome || 'Seu Nome';
    const [nomeEditado, setNomeEditado] = useState(nome);
    const [notificacoesPendentes, setNotificacoesPendentes] = useState(null);
    const [modalVisivel, setModalVisivel] = useState(false);
    const [carregando, setCarregando] = useState(true);
    const [perfilCarregado, setPerfilCarregado] = useState(false);
    const [salvando, setSalvando] = useState(null);
    const [erroPerfil, setErroPerfil] = useState('');
    const [erroEdicao, setErroEdicao] = useState('');
    const operacaoEmCurso = useRef(false);
    const notificacoes = notificacoesPendentes ?? usuario?.st_notificacao ?? false;
    const ocupado = carregando || salvando !== null || !perfilCarregado;

    const carregarPerfil = useCallback(async () => {
        if (operacaoEmCurso.current) return;

        operacaoEmCurso.current = true;
        setCarregando(true);
        setErroPerfil('');

        try {
            await recarregarPerfil();
            setPerfilCarregado(true);
        } catch {
            setErroPerfil('Não foi possível carregar seu perfil. Verifique a conexão e tente novamente.');
        } finally {
            operacaoEmCurso.current = false;
            setCarregando(false);
        }
    }, [recarregarPerfil]);

    useFocusEffect(useCallback(() => {
        carregarPerfil();
    }, [carregarPerfil]));

    function abrirEdicao() {
        if (ocupado || operacaoEmCurso.current) return;

        setNomeEditado(nome === 'Seu Nome' ? '' : nome);
        setErroEdicao('');
        setModalVisivel(true);
    }

    async function salvarNome() {
        if (ocupado || operacaoEmCurso.current) return;

        const nomeFinal = nomeEditado.trim();

        if (!nomeFinal || nomeFinal.length > 100) {
            setErroEdicao('Informe um nome com até 100 caracteres.');
            return;
        }

        operacaoEmCurso.current = true;
        setSalvando('nome');
        setErroEdicao('');

        try {
            await atualizarNome(nomeFinal);
            setModalVisivel(false);
        } catch {
            setErroEdicao('Não foi possível salvar o nome. Verifique a conexão e tente novamente.');
        } finally {
            operacaoEmCurso.current = false;
            setSalvando(null);
        }
    }

    async function alternarNotificacoes(valor) {
        if (ocupado || operacaoEmCurso.current) return;

        operacaoEmCurso.current = true;
        setNotificacoesPendentes(valor);
        setSalvando('notificacoes');
        setErroPerfil('');

        try {
            await salvarNotificacoes(valor);
        } catch {
            setErroPerfil('Não foi possível confirmar a alteração das notificações. Verifique a conexão e tente novamente.');
        } finally {
            operacaoEmCurso.current = false;
            setNotificacoesPendentes(null);
            setSalvando(null);
        }
    }

    function sairDaConta() {
        const confirmarSaida = async () => {
            try {
                await logout();
            } catch {
                if (Platform.OS === 'web') window.alert('Não foi possível sair. Tente novamente.');
                else Alert.alert('Erro', 'Não foi possível sair. Tente novamente.');
            }
        };
        if (Platform.OS === 'web') {
            if (window.confirm('Tem certeza de que deseja sair da conta?')) confirmarSaida();
        } else {
            Alert.alert('Sair da conta', 'Tem certeza de que deseja sair?', [
                {
                    text: 'Cancelar',
                    style: 'cancel',
                },
                {
                    text: 'Sair',
                    style: 'destructive',
                    onPress: confirmarSaida,
                },
            ]);
        }
    }
    function voltar() {
        if (navigation.canGoBack()) {
            navigation.goBack();
        } else {
            navigation.navigate('Home');
        }
    }
    return (
        <LinearGradient colors={DEGRADES.fundo} style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={CORES.textoEscuro} />

            <AreaDaTela>
                <View style={styles.content}>
                    {/* CABEÇALHO */}
                    <Cabecalho
                        titulo="Seu perfil"
                        navigation={navigation}
                        mostrarPerfil={false}
                        onVoltar={voltar}
                        onEditar={abrirEdicao}
                        edicaoDesabilitada={ocupado}
                    />

                    <ScrollView
                        style={styles.scroll}
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                    >
                        {/* CARD DO PERFIL */}
                        <LinearGradient colors={DEGRADES.cartao} style={styles.profileCard}>
                            <View style={styles.profileTop}>
                                <View style={styles.avatar} accessibilityLabel={`Avatar de ${nome}`}>
                                    <Ionicons name="person-outline" size={43} color={CORES.textoEscuro} />
                                    <View style={styles.avatarBadge}>
                                        <Ionicons name="leaf" size={12} color={CORES.textoEscuro} />
                                    </View>
                                </View>

                                <View style={styles.profileInfo}>
                                    <Text style={styles.eyebrow}>SEU ESPAÇO, SEU TEMPO</Text>
                                    <Text style={styles.userName}>{nome}</Text>
                                    <Text style={styles.userSubtitle}>Um passo de cada vez. 💚</Text>
                                </View>
                            </View>

                            <View style={styles.profileDivider} />

                            <View style={styles.profileFooter}>
                                <Ionicons name="leaf-outline" size={17} color={CORES.icone} />
                                <Text style={styles.profileFooterText}>Cuide de você com carinho.</Text>
                            </View>

                            <TouchableOpacity
                                style={styles.editProfileButton}
                                onPress={abrirEdicao}
                                disabled={ocupado}
                                accessibilityRole="button"
                                accessibilityLabel="Editar nome"
                                accessibilityState={{ disabled: ocupado }}
                                activeOpacity={0.8}
                            >
                                <Ionicons name="pencil-outline" size={16} color={CORES.textoEscuro} />
                                <Text style={styles.editProfileText}>Editar perfil</Text>
                            </TouchableOpacity>
                        </LinearGradient>

                        {/* CONFIGURAÇÕES */}
                        <View style={styles.sectionHeading}>
                            <View>
                                <Text style={styles.sectionTitle}>Seu espaço</Text>
                                <Text style={styles.sectionSubtitle}>Deixe tudo do seu jeito.</Text>
                            </View>

                            <View style={styles.sectionIcon}>
                                <Ionicons name="settings-outline" size={22} color="#2A4705" />
                            </View>
                        </View>

                        {/* CARD DE NOTIFICAÇÕES */}
                        <LinearGradient colors={DEGRADES.cartao} style={styles.settingCard}>
                            <View style={styles.settingIcon}>
                                <Ionicons name="notifications-outline" size={23} color={CORES.icone} />
                            </View>

                            <View style={styles.settingText}>
                                <Text style={styles.settingTitle}>Notificações</Text>
                                <Text style={styles.settingSubtitle}>
                                    {carregando ? 'Carregando preferência…' : salvando === 'notificacoes'
                                        ? 'Salvando preferência…' : notificacoes ? 'Notificações ativadas' : 'Notificações desativadas'}
                                </Text>
                            </View>

                            <Switch
                                value={notificacoes}
                                onValueChange={alternarNotificacoes}
                                disabled={ocupado}
                                accessibilityState={{ disabled: ocupado, busy: salvando === 'notificacoes' }}
                                trackColor={{
                                    false: 'rgba(255,255,255,0.25)',
                                    true: '#96C433',
                                }}
                                thumbColor={notificacoes ? '#D5FF73' : '#eeeeee'}
                                ios_backgroundColor="rgba(255,255,255,0.25)"
                                accessibilityLabel="Ativar ou desativar notificações"
                            />
                        </LinearGradient>

                        {erroPerfil ? (
                            <View style={styles.feedback}>
                                <Text style={styles.feedbackText} accessibilityRole="alert">{erroPerfil}</Text>
                                <TouchableOpacity
                                    onPress={carregarPerfil}
                                    disabled={carregando || salvando !== null}
                                    accessibilityRole="button"
                                    accessibilityLabel="Recarregar perfil"
                                >
                                    <Text style={styles.retryText}>Tentar novamente</Text>
                                </TouchableOpacity>
                            </View>
                        ) : null}

                        {/* CARD MOTIVACIONAL */}
                        <LinearGradient colors={DEGRADES.cartao} style={styles.messageCard}>
                            <View style={styles.sunContainer}>
                                <Ionicons name="sunny" size={43} color="#D5FF73" />
                            </View>

                            <Text style={styles.messageEyebrow}>UM LEMBRETE PARA VOCÊ</Text>

                            <Text style={styles.messageQuote}>
                                “Sua mente é o seu jardim mais precioso. Cuidar de si também é aprender a
                                caminhar com gentileza.”
                            </Text>

                            <View style={styles.messageDivider} />

                            <Text style={styles.messageFooter}>Você não precisa dar conta de tudo hoje.</Text>

                            <View style={styles.signature}>
                                <Ionicons name="heart" size={14} color={CORES.icone} />
                                <Text style={styles.signatureText}>Com carinho, Amparo</Text>
                            </View>
                        </LinearGradient>

                        {/* CARD DE AUTOCUIDADO */}
                        <View style={styles.careCard}>
                            <View style={styles.careIcon}>
                                <Ionicons name="flower-outline" size={25} color={CORES.icone} />
                            </View>

                            <View style={styles.careContent}>
                                <Text style={styles.careTitle}>Respeite seu ritmo</Text>
                                <Text style={styles.careText}>
                                    Pequenos momentos de cuidado também importam. Vá no seu tempo e acolha o
                                    que sente.
                                </Text>
                            </View>
                        </View>

                        {/* SAIR DA CONTA */}
                        <TouchableOpacity
                            style={styles.logoutButton}
                            onPress={sairDaConta}
                            activeOpacity={0.8}
                            accessibilityRole="button"
                            accessibilityLabel="Sair da conta"
                        >
                            <Ionicons name="log-out-outline" size={20} color="#FF9999" />
                            <Text style={styles.logoutText}>Sair da conta</Text>
                        </TouchableOpacity>

                        <Text style={styles.versionText}>AMPARO • UM DIA DE CADA VEZ</Text>
                    </ScrollView>

                    {/* BARRA INFERIOR IGUAL À DO DIÁRIO */}
                    <NavegacaoInferior navigation={navigation} ativa="Perfil" />
                </View>
            </AreaDaTela>

            {/* MODAL PARA EDITAR O NOME */}
            <Modal
                visible={modalVisivel}
                transparent
                animationType="fade"
                onRequestClose={() => { if (salvando !== 'nome') setModalVisivel(false); }}
            >
                <KeyboardAvoidingView
                    style={styles.modalOverlay}
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                >
                    <View style={styles.modalCard}>
                        <LinearGradient colors={DEGRADES.navegacao} style={styles.modalIcon}>
                            <Ionicons name="person-outline" size={28} color={CORES.icone} />
                        </LinearGradient>

                        <Text style={styles.modalTitle}>Como podemos te chamar?</Text>
                        <Text style={styles.modalSubtitle}>Escolha o nome que aparecerá no seu perfil.</Text>

                        <TextInput
                            style={styles.nameInput}
                            value={nomeEditado}
                            onChangeText={setNomeEditado}
                            placeholder="Digite seu nome"
                            placeholderTextColor="#879182"
                            autoFocus
                            maxLength={100}
                            editable={salvando !== 'nome'}
                            accessibilityLabel="Nome do perfil"
                            returnKeyType="done"
                            onSubmitEditing={salvarNome}
                        />

                        {erroEdicao ? <Text style={styles.editError} accessibilityRole="alert">{erroEdicao}</Text> : null}

                        <TouchableOpacity
                            style={styles.saveButton}
                            onPress={salvarNome}
                            activeOpacity={0.8}
                            disabled={salvando === 'nome'}
                            accessibilityRole="button"
                            accessibilityLabel="Salvar alterações"
                            accessibilityState={{ disabled: salvando === 'nome', busy: salvando === 'nome' }}
                        >
                            <Text style={styles.saveButtonText}>{salvando === 'nome' ? 'Salvando…' : 'Salvar alterações'}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={() => setModalVisivel(false)}
                            disabled={salvando === 'nome'}
                            accessibilityRole="button"
                            accessibilityLabel="Cancelar edição"
                        >
                            <Text style={styles.cancelButtonText}>Cancelar</Text>
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </LinearGradient>
    );
}
const styles = criarEstilos({
    feedback: {
        marginTop: 12,
        padding: 14,
        borderRadius: 16,
        backgroundColor: CORES.textoEscuro,
    },
    feedbackText: {
        color: CORES.textoSuave,
        fontSize: 13,
        lineHeight: 19,
    },
    retryText: {
        color: CORES.icone,
        fontWeight: '700',
        paddingTop: 12,
    },
    editError: {
        color: '#8C2424',
        fontSize: 13,
        lineHeight: 19,
        marginTop: 12,
    },
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
    },
    scroll: {
        flex: 1,
        marginHorizontal: 16,
        marginBottom: 10,
    },
    scrollContent: {
        paddingBottom: 20,
    },
    profileCard: {
        borderRadius: 28,
        padding: 18,
        borderWidth: 1,
        borderColor: 'rgba(189,232,104,0.25)',
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.25,
        shadowRadius: 6,
    },
    profileTop: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 15,
    },
    avatar: {
        width: 78,
        height: 78,
        borderRadius: 39,
        backgroundColor: CORES.textoSuave,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: CORES.icone,
    },
    avatarBadge: {
        position: 'absolute',
        right: -2,
        bottom: -1,
        width: 25,
        height: 25,
        borderRadius: 13,
        backgroundColor: '#D5FF73',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#223f00',
    },
    profileInfo: {
        flex: 1,
    },
    eyebrow: {
        color: CORES.icone,
        fontSize: 9,
        letterSpacing: 1,
        fontWeight: '800',
        marginBottom: 6,
    },
    userName: {
        color: '#FFFFFF',
        fontSize: 24,
        fontWeight: '800',
    },
    userSubtitle: {
        color: 'rgba(255,255,255,0.75)',
        fontSize: 12,
        marginTop: 6,
    },
    profileDivider: {
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.13)',
        marginTop: 19,
        marginBottom: 13,
    },
    profileFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    profileFooterText: {
        color: 'rgba(255,255,255,0.85)',
        fontSize: 12,
    },
    editProfileButton: {
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7,
        marginTop: 17,
        backgroundColor: '#D5FF73',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 14,
    },
    editProfileText: {
        color: CORES.textoEscuro,
        fontSize: 13,
        fontWeight: '800',
    },
    sectionHeading: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 23,
        marginBottom: 13,
        paddingHorizontal: 3,
    },
    sectionTitle: {
        color: CORES.textoEscuro,
        fontSize: 22,
        fontWeight: '800',
    },
    sectionSubtitle: {
        color: '#35551C',
        fontSize: 12,
        marginTop: 4,
    },
    sectionIcon: {
        width: 42,
        height: 42,
        borderRadius: 14,
        backgroundColor: 'rgba(255,255,255,0.45)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    settingCard: {
        borderRadius: 20,
        padding: 15,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(189,232,104,0.2)',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 3,
        },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    settingIcon: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: 'rgba(189,232,104,0.12)',
        borderWidth: 1,
        borderColor: 'rgba(189,232,104,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    settingText: {
        flex: 1,
        marginLeft: 12,
    },
    settingTitle: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700',
    },
    settingSubtitle: {
        color: 'rgba(255,255,255,0.65)',
        fontSize: 11,
        marginTop: 5,
    },
    messageCard: {
        marginTop: 15,
        borderRadius: 24,
        padding: 21,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(189,232,104,0.2)',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 3,
        },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    sunContainer: {
        width: 59,
        height: 59,
        borderRadius: 20,
        backgroundColor: 'rgba(189,232,104,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    messageEyebrow: {
        color: CORES.icone,
        fontSize: 10,
        letterSpacing: 1.4,
        fontWeight: '800',
        marginBottom: 13,
        textAlign: 'center',
    },
    messageQuote: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
        lineHeight: 25,
        textAlign: 'center',
    },
    messageDivider: {
        width: 43,
        height: 3,
        borderRadius: 2,
        backgroundColor: '#95CD33',
        marginVertical: 16,
    },
    messageFooter: {
        color: 'rgba(255,255,255,0.75)',
        fontSize: 12,
        lineHeight: 19,
        textAlign: 'center',
    },
    signature: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 16,
    },
    signatureText: {
        color: CORES.icone,
        fontSize: 11,
        fontWeight: '700',
    },
    careCard: {
        backgroundColor: 'rgba(28,48,7,0.92)',
        borderRadius: 18,
        marginTop: 15,
        flexDirection: 'row',
        alignItems: 'center',
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(189,232,104,0.2)',
        elevation: 3,
    },
    careIcon: {
        width: 53,
        alignSelf: 'stretch',
        backgroundColor: 'rgba(149,205,51,0.18)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    careContent: {
        flex: 1,
        padding: 14,
    },
    careTitle: {
        color: CORES.icone,
        fontSize: 14,
        fontWeight: '800',
    },
    careText: {
        color: 'rgba(255,255,255,0.85)',
        fontSize: 12,
        lineHeight: 18,
        marginTop: 5,
    },
    logoutButton: {
        marginTop: 18,
        height: 50,
        borderRadius: 16,
        backgroundColor: 'rgba(28,48,7,0.92)',
        borderWidth: 1,
        borderColor: 'rgba(255,128,128,0.28)',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 9,
    },
    logoutText: {
        color: '#FF9999',
        fontSize: 14,
        fontWeight: '700',
    },
    versionText: {
        textAlign: 'center',
        color: '#35551C',
        fontSize: 9,
        letterSpacing: 1.6,
        fontWeight: '700',
        marginTop: 17,
        marginBottom: 5,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(10,25,4,0.75)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    modalCard: {
        width: '100%',
        maxWidth: 400,
        backgroundColor: CORES.textoSuave,
        borderRadius: 27,
        padding: 24,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(42,71,5,0.15)',
    },
    modalIcon: {
        width: 58,
        height: 58,
        borderRadius: 19,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    modalTitle: {
        color: CORES.textoEscuro,
        fontSize: 20,
        fontWeight: '800',
        textAlign: 'center',
    },
    modalSubtitle: {
        color: '#526642',
        fontSize: 13,
        textAlign: 'center',
        lineHeight: 19,
        marginTop: 8,
        marginBottom: 20,
    },
    nameInput: {
        width: '100%',
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#B7D77C',
        paddingHorizontal: 15,
        paddingVertical: 13,
        color: CORES.textoEscuro,
        fontSize: 15,
    },
    saveButton: {
        width: '100%',
        backgroundColor: '#95CD33',
        borderRadius: 14,
        paddingVertical: 14,
        alignItems: 'center',
        marginTop: 17,
    },
    saveButtonText: {
        color: CORES.textoEscuro,
        fontWeight: '800',
        fontSize: 14,
    },
    cancelButton: {
        paddingVertical: 13,
        paddingHorizontal: 20,
        marginTop: 2,
    },
    cancelButtonText: {
        color: '#35551C',
        fontSize: 13,
        fontWeight: '600',
    },
});
