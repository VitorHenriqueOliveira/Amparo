import { criarEstilos } from '../theme/estilos';
import { AreaDaTela, Cabecalho, NavegacaoInferior } from '../components/NavegacaoPadrao';
import { CORES, DEGRADES } from '../theme/tema';
import { useCallback, useState, useContext } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    FlatList,
    Alert,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { listarDiario, criarNota, atualizarNota, excluirNota } from '../services/diario';
import { AuthContext } from '../contexts/AuthContext';
import { useFocusEffect } from '@react-navigation/native';
function mostrarMensagem(titulo, mensagem) {
    if (Platform.OS === 'web') window.alert(titulo + '\n\n' + mensagem);
    else Alert.alert(titulo, mensagem);
}
export default function DiarioScreen({ navigation }) {
    const { usuario } = useContext(AuthContext);
    const idUsuario = usuario.id_usuario;
    const [notes, setNotes] = useState([]);
    const [text, setText] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [isWriting, setIsWriting] = useState(false);
    const [notesLoaded, setNotesLoaded] = useState(false);
    const [saving, setSaving] = useState(false);
    const [loadError, setLoadError] = useState(false);
    useFocusEffect(
        useCallback(() => {
            let mounted = true;
            async function carregarNotas() {
                setNotesLoaded(false);
                setLoadError(false);
                try {
                    const notasSalvas = await listarDiario(idUsuario);
                    if (mounted) {
                        setNotes(Array.isArray(notasSalvas) ? notasSalvas : []);
                    }
                } catch (error) {
                    console.error('Erro ao carregar diário.');
                    if (mounted) {
                        setLoadError(true);
                    }
                } finally {
                    if (mounted) {
                        setNotesLoaded(true);
                    }
                }
            }
            carregarNotas();
            return () => {
                mounted = false;
            };
        }, [idUsuario])
    );
    const handleSave = async () => {
        if (!notesLoaded || saving) return;
        if (!text.trim()) {
            mostrarMensagem('Atenção', 'Escreva algo antes de salvar.');
            return;
        }
        setSaving(true);
        try {
            if (editingId !== null) {
                const nota = await atualizarNota(editingId, text.trim());
                setNotes((atuais) => atuais.map((item) => (item.id === nota.id ? nota : item)));
            } else {
                const nota = await criarNota(idUsuario, text.trim());
                setNotes((atuais) => [nota, ...atuais]);
            }
            setText('');
            setEditingId(null);
            setIsWriting(false);
        } catch (error) {
            console.error('Erro ao salvar registro.');
            mostrarMensagem('Erro ao salvar', 'Não foi possível salvar seu registro. Tente novamente.');
        } finally {
            setSaving(false);
        }
    };
    const handleEdit = (note) => {
        setText(note.text);
        setEditingId(note.id);
        setIsWriting(true);
    };
    const handleDelete = (id) => {
        const removeNote = async () => {
            if (!notesLoaded || saving) return;
            setSaving(true);
            try {
                await excluirNota(id);
                setNotes((atuais) => atuais.filter((note) => note.id !== id));
                if (editingId === id) {
                    setEditingId(null);
                    setText('');
                    setIsWriting(false);
                }
            } catch (error) {
                console.error('Erro ao excluir registro.');
                mostrarMensagem('Erro', 'Não foi possível excluir o registro.');
            } finally {
                setSaving(false);
            }
        };
        if (Platform.OS === 'web') {
            if (window.confirm('Deseja realmente excluir este registro?')) {
                removeNote();
            }
        } else {
            Alert.alert('Excluir registro', 'Deseja realmente excluir este registro?', [
                {
                    text: 'Cancelar',
                    style: 'cancel',
                },
                {
                    text: 'Excluir',
                    style: 'destructive',
                    onPress: removeNote,
                },
            ]);
        }
    };
    const handleCancel = () => {
        setIsWriting(false);
        setText('');
        setEditingId(null);
    };
    const abrirNovoRegistro = () => {
        setEditingId(null);
        setText('');
        setIsWriting(true);
    };
    return (
        <LinearGradient colors={DEGRADES.fundo} style={styles.container}>
            <AreaDaTela>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.keyboardView}
                >
                    {/* CABEÇALHO */}
                    <Cabecalho titulo="Diário de Bordo" navigation={navigation} />

                    {/* CARD PRINCIPAL */}
                    <LinearGradient colors={DEGRADES.cartao} style={styles.mainCardContainer}>
                        {isWriting ? (
                            <View style={styles.editorContainer}>
                                <View style={styles.editorTopBar}>
                                    <Text style={styles.editorTitleLabel}>
                                        {editingId !== null ? 'Editar Registro' : 'Novo Registro'}
                                    </Text>

                                    <Ionicons name="create-outline" size={18} color={CORES.icone} />
                                </View>

                                <TextInput
                                    style={styles.editorInput}
                                    placeholder="Escreva como foi seu dia, seus sentimentos..."
                                    placeholderTextColor="rgba(255, 255, 255, 0.4)"
                                    multiline
                                    value={text}
                                    onChangeText={setText}
                                    editable={!saving}
                                    autoFocus
                                    textAlignVertical="top"
                                />

                                <View style={styles.editorActions}>
                                    <TouchableOpacity
                                        style={styles.cancelButton}
                                        onPress={handleCancel}
                                        disabled={saving}
                                    >
                                        <Text style={styles.cancelText}>Cancelar</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[styles.saveButton, saving && styles.disabledButton]}
                                        onPress={handleSave}
                                        disabled={saving || !notesLoaded}
                                    >
                                        <Text style={styles.saveButtonText}>
                                            {saving
                                                ? 'Salvando...'
                                                : editingId !== null
                                                  ? 'Atualizar'
                                                  : 'Salvar Registro'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ) : (
                            <View style={styles.listWrapper}>
                                {!notesLoaded ? (
                                    <View style={styles.emptyBox}>
                                        <Text style={styles.emptyText}>Carregando seus registros...</Text>
                                    </View>
                                ) : notes.length === 0 ? (
                                    <View style={styles.emptyBox}>
                                        <Ionicons
                                            name="journal-outline"
                                            size={54}
                                            color="rgba(255,255,255,0.3)"
                                        />
                                        <Text style={styles.emptyText}>
                                            {loadError
                                                ? 'Não foi possível carregar seus registros. Volte a esta tela para tentar novamente.'
                                                : 'Nenhum registro encontrado.\nToque no botão abaixo para adicionar.'}
                                        </Text>
                                    </View>
                                ) : (
                                    <FlatList
                                        data={notes}
                                        keyExtractor={(item) => String(item.id)}
                                        showsVerticalScrollIndicator={false}
                                        contentContainerStyle={{
                                            paddingBottom: 90,
                                            paddingTop: 4,
                                        }}
                                        renderItem={({ item }) => (
                                            <View style={styles.emotionCardStyle}>
                                                <View style={styles.cardSideBar} />

                                                <View style={styles.cardContentInner}>
                                                    <View style={styles.cardHeaderRow}>
                                                        <View style={styles.dateBadge}>
                                                            <Ionicons
                                                                name="calendar-outline"
                                                                size={11}
                                                                color="#FFF"
                                                                style={{
                                                                    marginRight: 4,
                                                                }}
                                                            />
                                                            <Text style={styles.noteDateText}>
                                                                {item.date}
                                                            </Text>
                                                        </View>
                                                    </View>

                                                    <Text style={styles.noteText}>{item.text}</Text>

                                                    <View style={styles.noteActionsRow}>
                                                        <TouchableOpacity
                                                            style={styles.editActionBtn}
                                                            onPress={() => handleEdit(item)}
                                                            disabled={saving}
                                                            activeOpacity={0.8}
                                                        >
                                                            <Ionicons
                                                                name="pencil"
                                                                size={12}
                                                                color={CORES.icone}
                                                                style={{
                                                                    marginRight: 4,
                                                                }}
                                                            />
                                                            <Text style={styles.actionBtnText}>Editar</Text>
                                                        </TouchableOpacity>

                                                        <TouchableOpacity
                                                            style={styles.deleteActionBtn}
                                                            onPress={() => handleDelete(item.id)}
                                                            disabled={saving}
                                                            activeOpacity={0.8}
                                                        >
                                                            <Ionicons
                                                                name="trash-outline"
                                                                size={12}
                                                                color="#FF8080"
                                                                style={{
                                                                    marginRight: 4,
                                                                }}
                                                            />
                                                            <Text style={styles.deleteBtnText}>Excluir</Text>
                                                        </TouchableOpacity>
                                                    </View>
                                                </View>
                                            </View>
                                        )}
                                    />
                                )}
                            </View>
                        )}

                        {/* BOTÃO FLUTUANTE */}
                        {!isWriting && (
                            <TouchableOpacity
                                style={styles.fabButton}
                                onPress={abrirNovoRegistro}
                                activeOpacity={0.85}
                                disabled={!notesLoaded}
                                accessibilityRole="button"
                                accessibilityLabel="Adicionar registro"
                            >
                                <LinearGradient colors={['#D5FF73', '#96C433']} style={styles.fabGradient}>
                                    <Ionicons name="add" size={28} color="#1C3205" />
                                </LinearGradient>
                            </TouchableOpacity>
                        )}
                    </LinearGradient>

                    {/* NAVEGAÇÃO INFERIOR: OS CINCO ÍCONES DA HOME */}
                    <NavegacaoInferior navigation={navigation} ativa="Diario" />
                </KeyboardAvoidingView>
            </AreaDaTela>
        </LinearGradient>
    );
}
const styles = criarEstilos({
    container: {
        flex: 1,
    },
    keyboardView: {
        flex: 1,
    },
    mainCardContainer: {
        flex: 1,
        borderRadius: 28,
        marginHorizontal: 16,
        marginBottom: 10,
        padding: 16,
        position: 'relative',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.12)',
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.25,
        shadowRadius: 6,
    },
    editorContainer: {
        flex: 1,
    },
    editorTopBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.1)',
    },
    editorTitleLabel: {
        color: CORES.icone,
        fontWeight: 'bold',
        fontSize: 15,
    },
    editorInput: {
        flex: 1,
        color: '#FFF',
        fontSize: 15,
        lineHeight: 24,
        backgroundColor: 'rgba(0,0,0,0.2)',
        borderRadius: 14,
        padding: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
    },
    editorActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 14,
    },
    cancelButton: {
        paddingVertical: 8,
        paddingHorizontal: 12,
    },
    cancelText: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 14,
        fontWeight: '600',
    },
    saveButton: {
        backgroundColor: '#639818',
        paddingVertical: 10,
        paddingHorizontal: 22,
        borderRadius: 14,
    },
    disabledButton: {
        opacity: 0.6,
    },
    saveButtonText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: 'bold',
    },
    listWrapper: {
        flex: 1,
    },
    emptyBox: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyText: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: 14,
        textAlign: 'center',
        marginTop: 12,
        lineHeight: 20,
    },
    emotionCardStyle: {
        backgroundColor: 'rgba(28, 48, 7, 0.85)',
        borderRadius: 18,
        marginBottom: 14,
        flexDirection: 'row',
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(189, 232, 104, 0.2)',
        elevation: 3,
    },
    cardSideBar: {
        width: 6,
        backgroundColor: '#95CD33',
    },
    cardContentInner: {
        flex: 1,
        padding: 14,
    },
    cardHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        marginBottom: 6,
    },
    dateBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        paddingVertical: 3,
        paddingHorizontal: 8,
        borderRadius: 8,
    },
    noteDateText: {
        fontSize: 11,
        color: '#FFF',
        fontWeight: '500',
    },
    noteText: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.9)',
        lineHeight: 21,
        marginBottom: 12,
    },
    noteActionsRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.08)',
        paddingTop: 10,
    },
    editActionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 4,
        paddingHorizontal: 8,
    },
    actionBtnText: {
        color: CORES.icone,
        fontSize: 12,
        fontWeight: '600',
    },
    deleteActionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 4,
        paddingHorizontal: 8,
    },
    deleteBtnText: {
        color: '#FF8080',
        fontSize: 12,
        fontWeight: '600',
    },
    fabButton: {
        position: 'absolute',
        bottom: 16,
        right: 16,
        width: 52,
        height: 52,
        borderRadius: 26,
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 3,
        },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        zIndex: 10,
    },
    fabGradient: {
        width: '100%',
        height: '100%',
        borderRadius: 26,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
