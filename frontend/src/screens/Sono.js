import { criarEstilos } from '../theme/estilos';
import { AreaDaTela, Cabecalho, NavegacaoInferior } from '../components/NavegacaoPadrao';
import { DEGRADES } from '../theme/tema';
import React, { useEffect, useState, useContext } from 'react';
import {
    View,
    Text,
    TouchableOpacity,

    Modal,
    TextInput,
    ScrollView,
    Alert,
    Platform,
    ActivityIndicator,
} from 'react-native';

import { listarSono, registrarSonoHoje } from '../storage/registros';
import { AuthContext } from '../contexts/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const DEFAULT_SLEEP_TIME = '22:30';
const DEFAULT_WAKE_TIME = '06:30';

// Mesmos cinco ícones e a mesma ordem da tela Diário.

function isValidTime(time) {
    return /^([01]\d|2[0-3]):[0-5]\d$/.test(time);
}

function calculateDuration(sleepTime, wakeTime) {
    const [sleepHours, sleepMinutes] = sleepTime.split(':').map(Number);
    const [wakeHours, wakeMinutes] = wakeTime.split(':').map(Number);

    const startMinutes = sleepHours * 60 + sleepMinutes;
    let endMinutes = wakeHours * 60 + wakeMinutes;

    if (endMinutes <= startMinutes) {
        endMinutes += 24 * 60;
    }

    return endMinutes - startMinutes;
}

function formatDuration(totalMinutes) {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (minutes === 0) {
        return `${hours}h`;
    }

    return `${hours}h${String(minutes).padStart(2, '0')}min`;
}

function getStatusInfo(totalMinutes) {
    if (totalMinutes < 6 * 60) {
        return {
            text: 'Descanso Insuficiente',
            color: '#f80000',
            icon: 'moon-outline',
        };
    }

    if (totalMinutes < 7 * 60) {
        return {
            text: 'Descanso Moderado',
            color: '#da8700',
            icon: 'partly-sunny-outline',
        };
    }

    if (totalMinutes <= 9 * 60) {
        return {
            text: 'Descanso Adequado',
            color: '#44a300',
            icon: 'checkmark-circle-outline',
        };
    }

    return {
        text: 'Sono acima de 9 horas',
        color: '#da8700',
        icon: 'moon-outline',
    };
}

export default function SonoScreen({ navigation }) {
    const { usuario } = useContext(AuthContext);
    const idUsuario = usuario.id_usuario;
    const [sleepTime, setSleepTime] = useState(DEFAULT_SLEEP_TIME);
    const [wakeTime, setWakeTime] = useState(DEFAULT_WAKE_TIME);

    const [modalVisible, setModalVisible] = useState(false);
    const [editType, setEditType] = useState(null);
    const [tempTime, setTempTime] = useState('');

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const totalMinutes = calculateDuration(sleepTime, wakeTime);

    const targetMinutes = 8 * 60;
    const progressPercent = Math.min(
        Math.round((totalMinutes / targetMinutes) * 100),
        100
    );

    const status = getStatusInfo(totalMinutes);

    useEffect(() => {
        let mounted = true;

        async function loadSleepData() {
            try {
                const history = await listarSono(idUsuario);

                if (!mounted || history.length === 0) {
                    return;
                }

                const sortedHistory = [...history].sort((a, b) =>
                    b.date.localeCompare(a.date)
                );

                const latest = sortedHistory[0];

                if (
                    isValidTime(latest.sleepTime) &&
                    isValidTime(latest.wakeTime)
                ) {
                    setSleepTime(latest.sleepTime);
                    setWakeTime(latest.wakeTime);
                }
            } catch (error) {
                console.error('Erro ao carregar registros de sono:', error);
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        }

        loadSleepData();

        return () => {
            mounted = false;
        };
    }, [idUsuario]);

    const showMessage = (title, message) => {
        if (Platform.OS === 'web') {
            alert(`${title}\n\n${message}`);
        } else {
            Alert.alert(title, message);
        }
    };

    const handleOpenEdit = (type) => {
        setEditType(type);
        setTempTime(type === 'sleep' ? sleepTime : wakeTime);
        setModalVisible(true);
    };

    const handleSaveTime = async () => {
        const normalizedTime = tempTime.trim();

        if (!isValidTime(normalizedTime)) {
            showMessage(
                'Horário inválido',
                'Digite um horário válido no formato HH:MM, por exemplo 22:30.'
            );
            return;
        }

        if (!editType || saving) {
            return;
        }

        const newSleepTime =
            editType === 'sleep' ? normalizedTime : sleepTime;

        const newWakeTime =
            editType === 'wake' ? normalizedTime : wakeTime;

        setSaving(true);

        try {
            await registrarSonoHoje(idUsuario, newSleepTime, newWakeTime);

            setSleepTime(newSleepTime);
            setWakeTime(newWakeTime);
            setModalVisible(false);
            setEditType(null);

            showMessage(
                'Registro salvo',
                'Seus horários de sono foram salvos com sucesso!'
            );
        } catch (error) {
            console.error('Erro ao salvar registro de sono:', error);

            showMessage(
                'Erro',
                'Não foi possível salvar os horários. Tente novamente.'
            );
        } finally {
            setSaving(false);
        }
    };

    const handleNavigation = (route) => {
        if (navigation && route) {
            navigation.navigate(route);
        }
    };

    return (
        <LinearGradient
            colors={DEGRADES.fundo}
            style={styles.container}
        >
            <AreaDaTela>
                {/* CABEÇALHO */}
                <Cabecalho titulo="Sono" navigation={navigation} />

                {/* CONTEÚDO */}
                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#274804" />
                        <Text style={styles.loadingText}>
                            Carregando registros...
                        </Text>
                    </View>
                ) : (
                    <ScrollView
                        style={styles.content}
                        contentContainerStyle={styles.contentContainer}
                        showsVerticalScrollIndicator={false}
                    >
                        {/* CARD 1: TEMPO DE SONO */}
                        <View style={styles.cardMain}>
                            <View style={styles.moonCircle}>
                                <Ionicons name="moon" size={64} color="#FFF" />
                            </View>

                            <Text style={styles.sleepTimeText}>
                                {formatDuration(totalMinutes)}
                            </Text>

                            <Text style={styles.sleepTimeSub}>
                                Tempo de sono
                            </Text>

                            <View
                                style={[
                                    styles.statusBadge,
                                    { backgroundColor: status.color },
                                ]}
                            >
                                <Ionicons
                                    name={status.icon}
                                    size={18}
                                    color="#FFF"
                                    style={{ marginRight: 6 }}
                                />

                                <Text style={styles.statusBadgeText}>
                                    {status.text}
                                </Text>
                            </View>
                        </View>

                        {/* CARD 2: META E PROGRESSO */}
                        <View style={styles.cardMeta}>
                            <View style={styles.metaHeader}>
                                <View>
                                    <Text style={styles.metaTitle}>Sua meta</Text>
                                    <Text style={styles.metaSubtitle}>
                                        Meta de 7 a 8 horas de sono
                                    </Text>
                                </View>

                                <View style={styles.metaIcon}>
                                    <Ionicons
                                        name="flag-outline"
                                        size={22}
                                        color="#D6FF55"
                                    />
                                </View>
                            </View>

                            <View style={styles.progressBackground}>
                                <View
                                    style={[
                                        styles.progressFill,
                                        { width: `${progressPercent}%` },
                                    ]}
                                />
                            </View>

                            <View style={styles.progressLabels}>
                                <Text style={styles.progressText}>0h</Text>
                                <Text style={styles.progressPercent}>
                                    {progressPercent}% da meta
                                </Text>
                                <Text style={styles.progressText}>8h</Text>
                            </View>
                        </View>

                        {/* CARD 3: HORÁRIOS */}
                        <View style={styles.cardTimes}>
                            <View style={styles.timeColumn}>
                                <View style={styles.timeIconCircle}>
                                    <Ionicons
                                        name="moon-outline"
                                        size={24}
                                        color="#D6FF55"
                                    />
                                </View>

                                <Text style={styles.timeLabel}>
                                    Fui dormir às
                                </Text>

                                <Text style={styles.timeValue}>
                                    {sleepTime}
                                </Text>

                                <TouchableOpacity
                                    style={styles.editButton}
                                    onPress={() => handleOpenEdit('sleep')}
                                    activeOpacity={0.8}
                                    accessibilityRole="button"
                                    accessibilityLabel="Editar horário em que fui dormir"
                                >
                                    <Ionicons
                                        name="pencil-outline"
                                        size={14}
                                        color="#FFF"
                                        style={styles.editIcon}
                                    />
                                    <Text style={styles.editButtonText}>Editar</Text>
                                </TouchableOpacity>
                            </View>

                            <View style={styles.divider} />

                            <View style={styles.timeColumn}>
                                <View style={styles.timeIconCircle}>
                                    <Ionicons
                                        name="sunny-outline"
                                        size={24}
                                        color="#D6FF55"
                                    />
                                </View>

                                <Text style={styles.timeLabel}>
                                    Acordei às
                                </Text>

                                <Text style={styles.timeValue}>
                                    {wakeTime}
                                </Text>

                                <TouchableOpacity
                                    style={styles.editButton}
                                    onPress={() => handleOpenEdit('wake')}
                                    activeOpacity={0.8}
                                    accessibilityRole="button"
                                    accessibilityLabel="Editar horário em que acordei"
                                >
                                    <Ionicons
                                        name="pencil-outline"
                                        size={14}
                                        color="#FFF"
                                        style={styles.editIcon}
                                    />
                                    <Text style={styles.editButtonText}>Editar</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.historyNoteContainer}>
                            <Ionicons
                                name="shield-checkmark-outline"
                                size={16}
                                color="#325709"
                            />
                            <Text style={styles.historyNote}>
                                Seus registros são armazenados localmente no dispositivo.
                            </Text>
                        </View>
                    </ScrollView>
                )}

                {/* NAVEGAÇÃO INFERIOR: MESMA ORDEM E ÍCONES DO DIÁRIO */}
                <NavegacaoInferior navigation={navigation} ativa="Sono" />

                {/* MODAL DE EDIÇÃO */}
                <Modal
                    visible={modalVisible}
                    transparent
                    animationType="fade"
                    onRequestClose={() => {
                        if (!saving) {
                            setModalVisible(false);
                            setEditType(null);
                        }
                    }}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalIconCircle}>
                                <Ionicons
                                    name={editType === 'sleep' ? 'moon-outline' : 'sunny-outline'}
                                    size={28}
                                    color="#D6FF55"
                                />
                            </View>

                            <Text style={styles.modalTitle}>
                                {editType === 'sleep'
                                    ? 'Fui dormir às:'
                                    : 'Acordei às:'}
                            </Text>

                            <Text style={styles.modalSubtitle}>
                                Informe o horário no formato HH:MM.
                            </Text>

                            <TextInput
                                style={styles.modalInput}
                                value={tempTime}
                                onChangeText={setTempTime}
                                placeholder="HH:MM"
                                placeholderTextColor="#999"
                                keyboardType="numbers-and-punctuation"
                                maxLength={5}
                                autoCapitalize="none"
                                accessibilityLabel="Horário no formato horas e minutos"
                            />

                            <View style={styles.modalActions}>
                                <TouchableOpacity
                                    style={styles.modalCancel}
                                    onPress={() => {
                                        setModalVisible(false);
                                        setEditType(null);
                                    }}
                                    disabled={saving}
                                    accessibilityRole="button"
                                >
                                    <Text style={styles.modalCancelText}>
                                        Cancelar
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[
                                        styles.modalSave,
                                        saving && styles.disabledButton,
                                    ]}
                                    onPress={handleSaveTime}
                                    disabled={saving}
                                    accessibilityRole="button"
                                >
                                    <Text style={styles.modalSaveText}>
                                        {saving ? 'Salvando...' : 'Salvar'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
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

    content: {
        flex: 1,
    },

    contentContainer: {
        flexGrow: 1,
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 18,
        justifyContent: 'space-evenly',
        gap: 12,
    },

    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
    },

    loadingText: {
        color: '#274804',
        fontSize: 14,
        fontWeight: '600',
    },

    cardMain: {
        backgroundColor: '#162802',
        borderRadius: 24,
        paddingVertical: 20,
        paddingHorizontal: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.15)',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
    },

    moonCircle: {
        width: 96,
        height: 96,
        borderRadius: 48,
        backgroundColor: '#436B09',
        borderWidth: 1,
        borderColor: 'rgba(214,255,85,0.35)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
    },

    sleepTimeText: {
        fontSize: 34,
        fontWeight: '900',
        color: '#FFF',
        letterSpacing: 0.5,
    },

    sleepTimeSub: {
        fontSize: 14,
        color: '#E0F0C0',
        marginBottom: 14,
        marginTop: 2,
    },

    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
    },

    statusBadgeText: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 13,
    },

    cardMeta: {
        backgroundColor: '#3A6B0A',
        borderRadius: 20,
        padding: 18,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.15)',
        elevation: 3,
    },

    metaHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 14,
    },

    metaTitle: {
        fontSize: 17,
        fontWeight: '900',
        color: '#FFF',
    },

    metaSubtitle: {
        fontSize: 12,
        color: '#E0F0C0',
        marginTop: 4,
    },

    metaIcon: {
        width: 42,
        height: 42,
        borderRadius: 15,
        backgroundColor: 'rgba(214,255,85,0.10)',
        borderWidth: 1,
        borderColor: 'rgba(214,255,85,0.25)',
        justifyContent: 'center',
        alignItems: 'center',
    },

    progressBackground: {
        height: 12,
        backgroundColor: '#1A2E03',
        borderRadius: 7,
        overflow: 'hidden',
    },

    progressFill: {
        height: '100%',
        backgroundColor: '#C8FF00',
        borderRadius: 7,
    },

    progressLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 8,
    },

    progressText: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.65)',
    },

    progressPercent: {
        fontSize: 12,
        fontWeight: '700',
        color: '#D6FF55',
    },

    cardTimes: {
        backgroundColor: '#223F00',
        borderRadius: 20,
        paddingVertical: 18,
        paddingHorizontal: 10,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.15)',
        elevation: 3,
    },

    timeColumn: {
        flex: 1,
        alignItems: 'center',
    },

    timeIconCircle: {
        width: 42,
        height: 42,
        borderRadius: 15,
        backgroundColor: 'rgba(214,255,85,0.10)',
        borderWidth: 1,
        borderColor: 'rgba(214,255,85,0.22)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 6,
    },

    divider: {
        width: 1,
        height: 112,
        backgroundColor: 'rgba(255,255,255,0.2)',
        marginHorizontal: 6,
    },

    timeLabel: {
        fontSize: 12,
        color: '#E0F0C0',
        marginTop: 4,
        textAlign: 'center',
    },

    timeValue: {
        fontSize: 22,
        fontWeight: '900',
        color: '#FFF',
        marginVertical: 8,
    },

    editButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#436B09',
        borderWidth: 1,
        borderColor: 'rgba(214,255,85,0.2)',
        paddingVertical: 8,
        paddingHorizontal: 18,
        borderRadius: 14,
    },

    editIcon: {
        marginRight: 5,
    },

    editButtonText: {
        color: '#FFF',
        fontSize: 13,
        fontWeight: 'bold',
    },

    historyNoteContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 8,
        gap: 6,
    },

    historyNote: {
        flexShrink: 1,
        fontSize: 11,
        color: '#274804',
        textAlign: 'center',
    },

    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },

    modalContent: {
        width: '100%',
        maxWidth: 360,
        backgroundColor: '#2B4808',
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(214,255,85,0.25)',
        elevation: 10,
    },

    modalIconCircle: {
        width: 58,
        height: 58,
        borderRadius: 20,
        backgroundColor: 'rgba(214,255,85,0.10)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },

    modalTitle: {
        fontSize: 19,
        fontWeight: '900',
        color: '#FFF',
        marginBottom: 6,
    },

    modalSubtitle: {
        fontSize: 13,
        color: '#D5E7BB',
        textAlign: 'center',
        marginBottom: 18,
    },

    modalInput: {
        backgroundColor: '#1A2E03',
        color: '#FFF',
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
        width: '100%',
        paddingVertical: 12,
        borderRadius: 14,
        marginBottom: 22,
        borderWidth: 1,
        borderColor: 'rgba(214,255,85,0.2)',
    },

    modalActions: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        gap: 12,
    },

    modalCancel: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 10,
    },

    modalCancelText: {
        color: '#D5E7BB',
        fontSize: 14,
        fontWeight: '600',
    },

    modalSave: {
        flex: 1,
        alignItems: 'center',
        backgroundColor: '#639818',
        paddingVertical: 12,
        paddingHorizontal: 15,
        borderRadius: 14,
    },

    modalSaveText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '900',
    },

    disabledButton: {
        opacity: 0.6,
    },
});
