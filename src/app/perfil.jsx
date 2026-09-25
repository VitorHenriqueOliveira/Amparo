import React, { useState } from 'react';
import { StyleSheet, Text, View, Pressable, SafeAreaView, Switch, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import ScreenBackground from '../components/ScreenBackground';
import ScreenHeader from '../components/ScreenHeader';
import BottomNav from '../components/BottomNav';
import { colors, serif, shadow } from '../theme/colors';
import { useAppData } from '../context/AppDataContext';

export default function Perfil() {
  const { profile, setProfile } = useAppData();
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(profile.name);

  const startEditing = () => {
    setDraftName(profile.name);
    setEditing(true);
  };

  const saveEditing = () => {
    const trimmed = draftName.trim();
    setProfile((p) => ({ ...p, name: trimmed || p.name }));
    setEditing(false);
  };

  const handleLogout = () => {
    Alert.alert('Sair', 'Deseja realmente sair da sua conta?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: () => router.replace('/login') },
    ]);
  };

  return (
    <View style={{ flex: 1 }}>
      <ScreenBackground variant="light">
        <SafeAreaView style={{ flex: 1 }}>
          <ScreenHeader
            title="Seu perfil"
            right={
              <Pressable
                style={styles.editPill}
                onPress={editing ? saveEditing : startEditing}
              >
                <Text style={styles.editPillText}>{editing ? 'Salvar' : 'Editar'}</Text>
              </Pressable>
            }
          />

          <View style={styles.body}>
            <View style={styles.avatarRow}>
              <View style={styles.avatar}>
                <Ionicons name="person" size={30} color={colors.dark} />
              </View>
              {editing ? (
                <TextInput
                  style={styles.nameInput}
                  value={draftName}
                  onChangeText={setDraftName}
                  placeholder="Seu nome"
                  placeholderTextColor={colors.textMuted}
                  autoFocus
                  onSubmitEditing={saveEditing}
                />
              ) : (
                <Text style={styles.name}>{profile.name}</Text>
              )}
            </View>

            <View style={[styles.row, shadow]}>
              <Text style={styles.rowLabel}>notificações</Text>
              <Switch
                value={profile.notifications}
                onValueChange={(v) => setProfile((p) => ({ ...p, notifications: v }))}
                trackColor={{ false: colors.mid, true: colors.light }}
                thumbColor={colors.white}
              />
            </View>

            <View style={[styles.quoteCard, shadow]}>
              <Ionicons name="sunny" size={36} color="#f5c518" />
              <Text style={styles.quoteText}>
                Seu momento é o seu jardim mais precioso. Lembre-se de cuidar dele todos os dias,
                com um olhar gentil. Hoje, use dicas mais leves para acompanhar seu progresso e
                colher a sua melhor recompensa.
              </Text>
            </View>

            <Pressable style={styles.logoutBtn} onPress={handleLogout}>
              <Text style={styles.logoutText}>Sair</Text>
            </Pressable>
          </View>

          <BottomNav />
        </SafeAreaView>
      </ScreenBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  editPill: {
    backgroundColor: colors.light,
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  editPillText: {
    color: colors.darker,
    fontWeight: '700',
    fontSize: 13,
  },
  body: {
    flex: 1,
    paddingHorizontal: 16,
    gap: 16,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 4,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.lighter,
    borderWidth: 2,
    borderColor: colors.light,
    justifyContent: 'center',
    alignItems: 'center',
  },
  name: {
    fontFamily: serif,
    fontSize: 18,
    color: colors.textDark,
  },
  nameInput: {
    flex: 1,
    fontFamily: serif,
    fontSize: 18,
    color: colors.textDark,
    borderBottomWidth: 1,
    borderBottomColor: colors.mid,
    paddingVertical: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.lighter,
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  rowLabel: {
    fontFamily: serif,
    fontSize: 15,
    color: colors.textDark,
  },
  quoteCard: {
    backgroundColor: colors.darker,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    gap: 12,
  },
  quoteText: {
    color: colors.textOnDark,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },
  logoutBtn: {
    backgroundColor: colors.pillGreen,
    borderRadius: 20,
    paddingVertical: 14,
    alignItems: 'center',
  },
  logoutText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 15,
  },
});
