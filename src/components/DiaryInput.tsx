// src/components/DiaryInput.tsx
import React from 'react';
import { TextInput, StyleSheet } from 'react-native';
import { colors } from '../constants/diary';

interface DiaryInputProps {
  value: string;
  onChangeText: (text: string) => void;
}

/**
 * Campo de texto livre para o usuário descrever o que está acontecendo.
 * Preenchimento opcional — o registro pode ser salvo somente com o humor.
 */
export default function DiaryInput({ value, onChangeText }: DiaryInputProps) {
  return (
    <TextInput
      style={styles.input}
      value={value}
      onChangeText={onChangeText}
      placeholder="Escreva sobre como você está se sentindo..."
      placeholderTextColor={colors.textSecondary}
      multiline
      numberOfLines={5}
      textAlignVertical="top"
      accessibilityLabel="Campo de texto para descrever seu dia"
    />
  );
}

const styles = StyleSheet.create({
  input: {
    minHeight: 120,
    maxHeight: 180,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
    fontSize: 15,
    color: colors.textPrimary,
    lineHeight: 21,
  },
});
