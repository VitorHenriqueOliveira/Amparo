import React, { useState, useEffect, useContext } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    FlatList,
    Alert,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import api from '../services/api';
import { AuthContext } from '../contexts/AuthContext';

export default function DiarioScreen({ navigation }) {
    // Estados para gerenciar os dados
    const [notes, setNotes] = useState([]);
    const [text, setText] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [isWriting, setIsWriting] = useState(false);

    const { usuario } = useContext(AuthContext);
    const idUsuarioLogado = usuario?.id_usuario;

    // Função para buscar as notas do banco (LIGAÇÃO COM O NEON DB)
    const loadNotes = async () => {
        try {
            const response = await api.get(`/diario/${idUsuarioLogado}`);
            setNotes(response.data);
        } catch (error) {
            console.log('Erro ao buscar notas:', error);
        }
    };

    // Carrega as notas assim que a tela abre
    useEffect(() => {
        loadNotes();
    }, []);

    // Formata a data que vem do banco para o padrão brasileiro (DD/MM/YYYY)
    const formatDBDate = (dateString) => {
        const date = new Date(dateString);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    };

    // Lógica de SALVAR e ATUALIZAR
    const handleSave = async () => {
        if (!text.trim()) {
            setIsWriting(false);
            return;
        }

        try {
            if (editingId) {
                // LIGAÇÃO COM O NEON DB - Atualizando nota existente
                await api.put(`/diario/${editingId}`, {
                    descricao: text.trim(),
                });
            } else {
                // LIGAÇÃO COM O NEON DB - Salvando nova nota
                await api.post('/diario', {
                    id_usuario: idUsuarioLogado,
                    descricao: text.trim(),
                });
            }

            // Atualiza a lista com os dados do banco e reseta os campos
            await loadNotes();
            setText('');
            setEditingId(null);
            setIsWriting(false);
        } catch (error) {
            console.log('Erro ao salvar ou atualizar nota:', error);
        }
    };

    const handleEdit = (note) => {
        setText(note.descricao);
        setEditingId(note.id_diario);
        setIsWriting(true);
    };

    const handleDelete = (id) => {
        const removeNote = async () => {
            try {
                // LIGAÇÃO COM O NEON DB - Apagando a nota
                await api.delete(`/diario/${id}`);

                // Recarrega a lista do banco
                await loadNotes();

                if (editingId === id) {
                    setEditingId(null);
                    setText('');
                    setIsWriting(false);
                }
            } catch (error) {
                console.log('Erro ao deletar nota:', error);
            }
        };

        if (Platform.OS === 'web') {
            if (window.confirm('Tem certeza que deseja apagar este registro do seu diário?')) {
                removeNote();
            }
        } else {
            Alert.alert(
                'Excluir registro',
                'Tem certeza que deseja apagar este registro do seu diário?',
                [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'Excluir', style: 'destructive', onPress: removeNote },
                ]
            );
        }
    };

    return (
        <LinearGradient
            colors={['#bbff00', '#f0fcce', '#72a600']}
            style={styles.container}
        >
            <SafeAreaView style={styles.safeArea}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.keyboardView}
                >
                    {/* 1. CABEÇALHO ESCURO ARREDONDADO */}
                    <LinearGradient
                        colors={['#325709', '#274804']}
                        style={styles.headerBox}
                    >
                        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                            <Ionicons name="chevron-back" size={26} color="#FFF" />
                        </TouchableOpacity>

                        <Text style={styles.headerTitle}>Diário</Text>

                        <TouchableOpacity onPress={() => navigation.navigate('Perfil')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                            <Ionicons name="person-circle-outline" size={30} color="#FFF" />
                        </TouchableOpacity>
                    </LinearGradient>

                    {/* 2. CARD CENTRAL PRINCIPAL (CAMADA ESCURA DO CANVA) */}
                    <LinearGradient
                        colors={['#498610', '#223f00', '#101B04']}
                        style={styles.mainCardContainer}
                    >
                        {isWriting ? (
                            <View style={styles.editorContainer}>
                                <TextInput
                                    style={styles.editorInput}
                                    placeholder="Escreva como foi seu dia aqui..."
                                    placeholderTextColor="rgba(255, 255, 255, 0.4)"
                                    multiline
                                    value={text}
                                    onChangeText={setText}
                                    autoFocus
                                    textAlignVertical="top"
                                />
                                <View style={styles.editorActions}>
                                    <TouchableOpacity
                                        style={styles.cancelButton}
                                        onPress={() => {
                                            setIsWriting(false);
                                            setText('');
                                            setEditingId(null);
                                        }}
                                    >
                                        <Text style={styles.cancelText}>Cancelar</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={styles.saveButton}
                                        onPress={handleSave}
                                    >
                                        <Text style={styles.saveButtonText}>
                                            {editingId ? 'Atualizar' : 'Salvar'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ) : (
                            <View style={styles.listWrapper}>
                                {notes.length === 0 ? (
                                    <View style={styles.emptyBox}>
                                        <Ionicons name="journal-outline" size={54} color="rgba(255,255,255,0.3)" />
                                        <Text style={styles.emptyText}>
                                            Seu diário está vazio.{'\n'}Clique no "+" para começar a escrever!
                                        </Text>
                                    </View>
                                ) : (
                                    <FlatList
                                        data={notes}
                                        keyExtractor={(item) => String(item.id_diario)} // ID vem do banco agora
                                        showsVerticalScrollIndicator={false}
                                        contentContainerStyle={{ paddingBottom: 65 }}
                                        renderItem={({ item }) => (
                                            <View style={styles.modernNoteCard}>
                                                {/* Data no canto superior */}
                                                <View style={styles.noteHeaderRow}>
                                                    <View style={styles.dateBadge}>
                                                        <Ionicons name="calendar-outline" size={12} color="#1C3205" style={{ marginRight: 4 }} />
                                                        <Text style={styles.noteDateText}>{formatDBDate(item.data_registro)}</Text>
                                                    </View>
                                                </View>

                                                {/* Texto da Nota (Usando a coluna 'descricao' do banco) */}
                                                <Text style={styles.noteText}>{item.descricao}</Text>

                                                {/* Botões Modernos de Editar/Excluir */}
                                                <View style={styles.noteActionsRow}>
                                                    <TouchableOpacity
                                                        style={styles.editActionBtn}
                                                        onPress={() => handleEdit(item)}
                                                        activeOpacity={0.8}
                                                    >
                                                        <Ionicons name="pencil-sharp" size={13} color="#FFF" style={{ marginRight: 4 }} />
                                                        <Text style={styles.actionBtnText}>Editar</Text>
                                                    </TouchableOpacity>

                                                    <TouchableOpacity
                                                        style={styles.deleteActionBtn}
                                                        onPress={() => handleDelete(item.id_diario)} // Enviando o ID do banco
                                                        activeOpacity={0.8}
                                                    >
                                                        <Ionicons name="trash-outline" size={13} color="#FFF" style={{ marginRight: 4 }} />
                                                        <Text style={styles.actionBtnText}>Excluir</Text>
                                                    </TouchableOpacity>
                                                </View>
                                            </View>
                                        )}
                                    />
                                )}
                            </View>
                        )}

                        {/* BOTÃO FLUTUANTE (+) DO CANVA */}
                        {!isWriting && (
                            <TouchableOpacity
                                style={styles.fabButton}
                                onPress={() => {
                                    setEditingId(null);
                                    setText('');
                                    setIsWriting(true);
                                }}
                                activeOpacity={0.88}
                            >
                                <Ionicons name="add" size={32} color="#162704" />
                            </TouchableOpacity>
                        )}
                    </LinearGradient>

                    {/* 3. BARRA DE NAVEGAÇÃO INFERIOR COM ÍCONES EM CÍRCULOS BRANCOS */}
                    <View style={styles.bottomNavbar}>
                        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Diario')}>
                            <View style={[styles.whiteCircleIcon, styles.activeCircle]}>
                                <Ionicons name="book" size={20} color="#162704" />
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Emocao')}>
                            <View style={styles.whiteCircleIcon}>
                                <MaterialCommunityIcons name="weather-sunny" size={22} color="#162704" />
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Sono')}>
                            <View style={styles.whiteCircleIcon}>
                                <Ionicons name="moon-outline" size={20} color="#162704" />
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.navItem} onPress={() => alert('Em breve')}>
                            <View style={styles.whiteCircleIcon}>
                                <MaterialCommunityIcons name="weather-windy" size={22} color="#162704" />
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.navItem} onPress={() => alert('Em breve')}>
                            <View style={styles.whiteCircleIcon}>
                                <MaterialCommunityIcons name="sprout-outline" size={22} color="#162704" />
                            </View>
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    safeArea: { flex: 1 },
    keyboardView: { flex: 1 },

    // 1. Header Box
    headerBox: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginHorizontal: 16,
        marginTop: 8,
        marginBottom: 12,
        paddingHorizontal: 18,
        paddingVertical: 12,
        borderRadius: 22,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#FFF' },

    // 2. Card Central Escuro
    mainCardContainer: {
        flex: 1,
        borderRadius: 28,
        marginHorizontal: 16,
        marginBottom: 10,
        padding: 16,
        position: 'relative',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
    },

    // Editor de Escrita
    editorContainer: { flex: 1 },
    editorInput: {
        flex: 1,
        color: '#FFF',
        fontSize: 16,
        lineHeight: 24,
    },
    editorActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 10,
    },
    cancelButton: { paddingVertical: 8, paddingHorizontal: 12 },
    cancelText: { color: '#BDE868', fontSize: 14, fontWeight: '600' },
    saveButton: {
        backgroundColor: '#3F6B12',
        paddingVertical: 8,
        paddingHorizontal: 24,
        borderRadius: 14,
    },
    saveButtonText: { color: '#FFF', fontSize: 14, fontWeight: 'bold' },

    // Lista & Cards Modernos de Nota
    listWrapper: { flex: 1 },
    emptyBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyText: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: 15,
        textAlign: 'center',
        marginTop: 12,
    },
    modernNoteCard: {
        backgroundColor: '#A6C665',
        borderRadius: 20,
        padding: 16,
        marginBottom: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 3,
    },
    noteHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginBottom: 8,
    },
    dateBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.45)',
        paddingVertical: 3,
        paddingHorizontal: 10,
        borderRadius: 12,
    },
    noteDateText: {
        fontSize: 11,
        color: '#1C3205',
        fontWeight: 'bold',
    },
    noteText: {
        fontSize: 14,
        color: '#142503',
        lineHeight: 21,
        fontWeight: '500',
        marginBottom: 14,
    },
    noteActionsRow: {
        flexDirection: 'row',
        gap: 10,
    },
    editActionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#26420A',
        paddingVertical: 7,
        paddingHorizontal: 16,
        borderRadius: 12,
    },
    deleteActionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1B2C08',
        paddingVertical: 7,
        paddingHorizontal: 16,
        borderRadius: 12,
    },
    actionBtnText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: 'bold',
    },

    // Botão Flutuante (+)
    fabButton: {
        position: 'absolute',
        bottom: 16,
        right: 16,
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: '#FFF',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        zIndex: 10,
    },

    // 3. Navbar Inferior (Com os círculos brancos)
    bottomNavbar: {
        backgroundColor: '#1E3506',
        borderRadius: 30,
        height: 60,
        marginHorizontal: 16,
        marginBottom: 8,
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        elevation: 6,
    },
    navItem: { alignItems: 'center', justifyContent: 'center' },
    whiteCircleIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#FFF',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 2,
    },
    activeCircle: {
        borderWidth: 2,
        borderColor: '#dde9bb',
    },
});