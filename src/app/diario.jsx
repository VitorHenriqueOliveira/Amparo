import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  SafeAreaView,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenBackground from '../components/ScreenBackground';
import ScreenHeader from '../components/ScreenHeader';
import BottomNav from '../components/BottomNav';
import { colors, shadow } from '../theme/colors';
import { useAppData } from '../context/AppDataContext';

function todayBR() {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

export default function Diario() {
  const { diaryEntries, addDiaryEntry, updateDiaryEntry, deleteDiaryEntry } = useAppData();
  const [mode, setMode] = useState('list'); // 'list' | 'editor'
  const [editingId, setEditingId] = useState(null);
  const [draftText, setDraftText] = useState('');

  const openNew = () => {
    setEditingId(null);
    setDraftText('');
    setMode('editor');
  };

  const openEdit = (entry) => {
    setEditingId(entry.id);
    setDraftText(entry.text);
    setMode('editor');
  };

  const handleDelete = (id) => {
    Alert.alert('Excluir entrada', 'Tem certeza que deseja excluir esta entrada do diário?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: () => deleteDiaryEntry(id) },
    ]);
  };

  const handleSave = () => {
    if (!draftText.trim()) return;
    if (editingId) {
      updateDiaryEntry(editingId, draftText.trim());
    } else {
      addDiaryEntry(draftText.trim(), todayBR());
    }
    setMode('list');
  };

  if (mode === 'editor') {
    return (
      <View style={{ flex: 1 }}>
        <ScreenBackground variant="light">
          <SafeAreaView style={{ flex: 1 }}>
            <ScreenHeader title="Diário" />

            <View style={styles.editorBody}>
              <View style={[styles.editorCard, shadow]}>
                <Text style={styles.editorDate}>{todayBR()}</Text>
                <TextInput
                  style={styles.editorInput}
                  multiline
                  autoFocus
                  placeholder="Escreva aqui..."
                  placeholderTextColor={colors.textMuted}
                  value={draftText}
                  onChangeText={setDraftText}
                  textAlignVertical="top"
                />
              </View>

              <View style={styles.editorActions}>
                <Pressable style={[styles.actionBtn, styles.cancelBtn]} onPress={() => setMode('list')}>
                  <Text style={styles.actionText}>Cancelar</Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.actionBtn,
                    styles.saveBtn,
                    !draftText.trim() && styles.saveBtnDisabled,
                  ]}
                  onPress={handleSave}
                  disabled={!draftText.trim()}
                >
                  <Text style={styles.actionText}>Salvar</Text>
                </Pressable>
              </View>
            </View>

            <BottomNav active="diario" />
          </SafeAreaView>
        </ScreenBackground>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ScreenBackground variant="light">
        <SafeAreaView style={{ flex: 1 }}>
          <ScreenHeader title="Diário" />

          {diaryEntries.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="book-outline" size={40} color={colors.mid} />
              <Text style={styles.emptyText}>
                Você ainda não escreveu nada. Toque no + para começar seu primeiro registro.
              </Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.scroll}>
              {diaryEntries.map((entry) => (
                <View key={entry.id} style={[styles.card, shadow]}>
                  <View style={styles.dateBadge}>
                    <Ionicons name="calendar-outline" size={13} color={colors.dark} />
                    <Text style={styles.dateText}>{entry.date}</Text>
                  </View>

                  <Text style={styles.entryText} numberOfLines={4}>
                    {entry.text}
                  </Text>

                  <View style={styles.actionsRow}>
                    <Pressable style={styles.actionBtnSmall} onPress={() => openEdit(entry)}>
                      <Ionicons name="pencil" size={14} color={colors.white} />
                      <Text style={styles.actionTextSmall}>Editar</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.actionBtnSmall, styles.deleteBtn]}
                      onPress={() => handleDelete(entry.id)}
                    >
                      <Ionicons name="trash-outline" size={14} color={colors.white} />
                      <Text style={styles.actionTextSmall}>Excluir</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </ScrollView>
          )}

          <Pressable style={[styles.fab, shadow]} onPress={openNew}>
            <Ionicons name="add" size={28} color={colors.white} />
          </Pressable>

          <BottomNav active="diario" />
        </SafeAreaView>
      </ScreenBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyText: {
    color: colors.dark,
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
  },
  card: {
    backgroundColor: colors.lighter,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    backgroundColor: colors.mid,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 5,
    marginBottom: 10,
  },
  dateText: {
    color: colors.dark,
    fontSize: 11,
    fontWeight: '600',
  },
  entryText: {
    color: colors.textDark,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 14,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtnSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.darker,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  deleteBtn: {
    backgroundColor: '#4d1414',
  },
  actionTextSmall: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 90,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.pillGreen,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editorBody: {
    flex: 1,
    paddingHorizontal: 16,
  },
  editorCard: {
    flex: 1,
    backgroundColor: colors.darker,
    borderRadius: 24,
    padding: 18,
  },
  editorDate: {
    color: colors.textMuted,
    fontSize: 13,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.15)',
    paddingBottom: 10,
  },
  editorInput: {
    flex: 1,
    color: colors.white,
    fontSize: 15,
    lineHeight: 22,
  },
  editorActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    marginBottom: 8,
  },
  actionBtn: {
    flex: 1,
    borderRadius: 20,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelBtn: {
    backgroundColor: colors.mid,
  },
  saveBtn: {
    backgroundColor: colors.pillGreen,
  },
  saveBtnDisabled: {
    opacity: 0.5,
  },
  actionText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 14,
  },
});
