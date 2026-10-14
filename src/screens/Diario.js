import React, { useEffect, useState } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { listarDiario, salvarDiario } from '../storage/registros';

export default function DiarioScreen({ navigation }) {
  const [notes, setNotes] = useState([]);
  const [text, setText] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [isWriting, setIsWriting] = useState(false);
  const [notesLoaded, setNotesLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function carregarNotas() {
      try {
        const notasSalvas = await listarDiario();

        if (mounted) {
          setNotes(Array.isArray(notasSalvas) ? notasSalvas : []);
        }
      } catch (error) {
        console.error('Erro ao carregar diário:', error);

        if (mounted) {
          Alert.alert(
            'Erro',
            'Não foi possível carregar seus registros.'
          );
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
  }, []);

  const getFormattedDate = () => {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();

    return `${day}/${month}/${year}`;
  };

  const persistirNotas = async (notasAtualizadas) => {
    await salvarDiario(notasAtualizadas);
    setNotes(notasAtualizadas);
  };

  const handleSave = async () => {
    if (!notesLoaded || saving) return;

    if (!text.trim()) {
      Alert.alert('Atenção', 'Escreva algo antes de salvar.');
      return;
    }

    setSaving(true);

    try {
      let notasAtualizadas;

      if (editingId !== null) {
        notasAtualizadas = notes.map((note) =>
          note.id === editingId
            ? { ...note, text: text.trim() }
            : note
        );
      } else {
        const newNote = {
          id: Date.now().toString(),
          text: text.trim(),
          date: getFormattedDate(),
        };

        notasAtualizadas = [newNote, ...notes];
      }

      await persistirNotas(notasAtualizadas);

      setText('');
      setEditingId(null);
      setIsWriting(false);
    } catch (error) {
      console.error('Erro ao salvar registro:', error);
      Alert.alert(
        'Erro ao salvar',
        'Não foi possível salvar seu registro. Tente novamente.'
      );
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
        const notasAtualizadas = notes.filter(
          (note) => note.id !== id
        );

        await persistirNotas(notasAtualizadas);

        if (editingId === id) {
          setEditingId(null);
          setText('');
          setIsWriting(false);
        }
      } catch (error) {
        console.error('Erro ao excluir registro:', error);
        Alert.alert(
          'Erro',
          'Não foi possível excluir o registro.'
        );
      } finally {
        setSaving(false);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Deseja realmente excluir este registro?')) {
        removeNote();
      }
    } else {
      Alert.alert(
        'Excluir registro',
        'Deseja realmente excluir este registro?',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Excluir',
            style: 'destructive',
            onPress: removeNote,
          },
        ]
      );
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
    <LinearGradient
      colors={['#bbff00', '#f0fcce', '#72a600']}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          {/* CABEÇALHO */}
          <LinearGradient
            colors={['#2A4705', '#162802']}
            style={styles.headerBox}
          >
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel="Voltar"
            >
              <Ionicons
                name="chevron-back"
                size={24}
                color="#BDE868"
              />
            </TouchableOpacity>

            <Text style={styles.headerTitle}>Diário de Bordo</Text>

            <TouchableOpacity
              onPress={() => navigation.navigate('Perfil')}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel="Abrir perfil"
            >
              <Ionicons
                name="person-circle-outline"
                size={26}
                color="#BDE868"
              />
            </TouchableOpacity>
          </LinearGradient>

          {/* CARD PRINCIPAL */}
          <LinearGradient
            colors={['#498610', '#223f00', '#101B04']}
            style={styles.mainCardContainer}
          >
            {isWriting ? (
              <View style={styles.editorContainer}>
                <View style={styles.editorTopBar}>
                  <Text style={styles.editorTitleLabel}>
                    {editingId !== null
                      ? 'Editar Registro'
                      : 'Novo Registro'}
                  </Text>

                  <Ionicons
                    name="create-outline"
                    size={18}
                    color="#BDE868"
                  />
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
                    style={[
                      styles.saveButton,
                      saving && styles.disabledButton,
                    ]}
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
                    <Text style={styles.emptyText}>
                      Carregando seus registros...
                    </Text>
                  </View>
                ) : notes.length === 0 ? (
                  <View style={styles.emptyBox}>
                    <Ionicons
                      name="journal-outline"
                      size={54}
                      color="rgba(255,255,255,0.3)"
                    />
                    <Text style={styles.emptyText}>
                      Nenhum registro encontrado.{'\n'}
                      Toque no botão abaixo para adicionar.
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
                                style={{ marginRight: 4 }}
                              />
                              <Text style={styles.noteDateText}>
                                {item.date}
                              </Text>
                            </View>
                          </View>

                          <Text style={styles.noteText}>
                            {item.text}
                          </Text>

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
                                color="#BDE868"
                                style={{ marginRight: 4 }}
                              />
                              <Text style={styles.actionBtnText}>
                                Editar
                              </Text>
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
                                style={{ marginRight: 4 }}
                              />
                              <Text style={styles.deleteBtnText}>
                                Excluir
                              </Text>
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
                <LinearGradient
                  colors={['#D5FF73', '#96C433']}
                  style={styles.fabGradient}
                >
                  <Ionicons
                    name="add"
                    size={28}
                    color="#1C3205"
                  />
                </LinearGradient>
              </TouchableOpacity>
            )}
          </LinearGradient>

          {/* NAVEGAÇÃO INFERIOR: OS CINCO ÍCONES DA HOME */}
          <LinearGradient
            colors={['#2A4705', '#162802']}
            style={styles.bottomNavbar}
          >
            {/* Diário Emocional */}
            <TouchableOpacity
              style={styles.navItem}
              onPress={() => navigation.navigate('Diario')}
              accessibilityRole="button"
              accessibilityLabel="Diário Emocional"
            >
              <View style={styles.activeCircleIcon}>
                <Ionicons
                  name="book-outline"
                  size={22}
                  color="#162704"
                />
              </View>
            </TouchableOpacity>

            {/* Registro Emocional */}
            <TouchableOpacity
              style={styles.navItem}
              onPress={() => navigation.navigate('Emocao')}
              accessibilityRole="button"
              accessibilityLabel="Registro Emocional"
            >
              <Ionicons
                name="happy-outline"
                size={24}
                color="rgba(255,255,255,0.7)"
              />
            </TouchableOpacity>

            {/* Registro de Sono */}
            <TouchableOpacity
              style={styles.navItem}
              onPress={() => navigation.navigate('Sono')}
              accessibilityRole="button"
              accessibilityLabel="Registro de Sono"
            >
              <Ionicons
                name="moon-outline"
                size={24}
                color="rgba(255,255,255,0.7)"
              />
            </TouchableOpacity>

            {/* Evolução Emocional */}
            <TouchableOpacity
              style={styles.navItem}
              onPress={() => navigation.navigate('Grafico')}
              accessibilityRole="button"
              accessibilityLabel="Evolução Emocional"
            >
              <Ionicons
                name="trending-up-outline"
                size={24}
                color="rgba(255,255,255,0.7)"
              />
            </TouchableOpacity>

            {/* Modo Calma Urgente */}
            <TouchableOpacity
              style={styles.navItem}
              onPress={() => navigation.navigate('ModoCalma')}
              accessibilityRole="button"
              accessibilityLabel="Modo Calma Urgente"
            >
              <Ionicons
                name="heart-outline"
                size={24}
                color="rgba(255,255,255,0.7)"
              />
            </TouchableOpacity>
          </LinearGradient>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  keyboardView: { flex: 1 },

  headerBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 12,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 30,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },

  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
    letterSpacing: 0.5,
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
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },

  editorContainer: { flex: 1 },

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
    color: '#BDE868',
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

  listWrapper: { flex: 1 },

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
    color: '#BDE868',
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
    shadowOffset: { width: 0, height: 3 },
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

  bottomNavbar: {
    borderRadius: 30,
    height: 62,
    marginHorizontal: 16,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },

  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    height: '100%',
  },

  activeCircleIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#C8FF00',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#C8FF00',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 4,
  },
});