// src/components/TimeField.tsx
import React, { useState } from 'react';
import { View, Text, Pressable, TextInput, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/diary';

interface TimeFieldProps {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string; // "HH:mm"
  onChange: (value: string) => void;
}

/**
 * Campo de horário no formato "HH:mm", exibido como texto com um botão
 * "Editar". Ao tocar em editar, vira um campo de texto temporário;
 * ao confirmar, valida o formato antes de salvar.
 */
export default function TimeField({ icon, label, value, onChange }: TimeFieldProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  function handleStartEditing() {
    setDraft(value);
    setEditing(true);
  }

  function handleConfirm() {
    const isValid = /^([0-1]?\d|2[0-3]):([0-5]\d)$/.test(draft.trim());
    if (!isValid) {
      // Formato inválido: mantém o valor anterior e sai do modo de edição.
      setEditing(false);
      return;
    }
    onChange(draft.trim());
    setEditing(false);
  }

  return (
    <View style={styles.container}>
      <Ionicons name={icon} size={20} color={colors.textSecondary} />
      <Text style={styles.label}>{label}</Text>

      {editing ? (
        <TextInput
          value={draft}
          onChangeText={setDraft}
          onBlur={handleConfirm}
          onSubmitEditing={handleConfirm}
          placeholder="HH:MM"
          placeholderTextColor={colors.textSecondary}
          keyboardType="numbers-and-punctuation"
          maxLength={5}
          autoFocus
          style={styles.input}
          accessibilityLabel={`Editar ${label}`}
        />
      ) : (
        <Text style={styles.value}>{value}</Text>
      )}

      <Pressable
        onPress={editing ? handleConfirm : handleStartEditing}
        accessibilityRole="button"
        accessibilityLabel={editing ? `Confirmar ${label}` : `Editar ${label}`}
        style={styles.editButton}
      >
        <Text style={styles.editLabel}>{editing ? 'Confirmar' : 'Editar'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
  },
  label: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 6,
    marginBottom: 4,
  },
  value: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  input: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    borderBottomWidth: 1,
    borderBottomColor: colors.primaryGreen,
    minWidth: 70,
    textAlign: 'center',
    paddingVertical: 2,
    marginBottom: 8,
  },
  editButton: {
    backgroundColor: colors.veryLightGreen,
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  editLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryGreen,
  },
});
