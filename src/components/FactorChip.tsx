// src/components/FactorChip.tsx
import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { colors } from '../constants/diary';

interface FactorChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
}

/**
 * "Chip" selecionável para os fatores que influenciaram o dia do usuário.
 * Suporta seleção múltipla — o controle de qual está selecionado
 * fica a cargo da tela (DiaryScreen), este componente é apenas visual.
 */
export default function FactorChip({ label, selected, onPress }: FactorChipProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Fator: ${label}`}
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.chip,
        selected ? styles.chipSelected : undefined,
        pressed ? styles.pressed : undefined,
      ]}
    >
      <Text style={[styles.label, selected ? styles.labelSelected : undefined]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
    marginBottom: 8,
  },
  chipSelected: {
    backgroundColor: colors.primaryGreen,
    borderColor: colors.primaryGreen,
  },
  pressed: {
    opacity: 0.85,
  },
  label: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  labelSelected: {
    color: colors.white,
    fontWeight: '600',
  },
});
