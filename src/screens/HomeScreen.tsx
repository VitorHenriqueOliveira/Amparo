// src/screens/HomeScreen.tsx
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { colors } from '../constants/diary';

interface HomeScreenProps {
  /** Navega para a tela do Diário Emocional. Injetado pela rota (app/index.tsx). */
  onOpenDiary: () => void;
  /** Navega para a tela de Sono. Injetado pela rota (app/index.tsx). */
  onOpenSleep: () => void;
}

/**
 * Tela inicial provisória do Amparo.
 * Por enquanto contém apenas os atalhos para o Diário Emocional e o Sono,
 * como pedido — nenhuma outra funcionalidade foi adicionada aqui ainda.
 */
export default function HomeScreen({ onOpenDiary, onOpenSleep }: HomeScreenProps) {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.container}>
        <View style={styles.shortcut}>
          <Pressable
            onPress={onOpenDiary}
            accessibilityRole="button"
            accessibilityLabel="Abrir Diário Emocional"
            style={({ pressed }) => [styles.iconButton, pressed ? styles.pressed : undefined]}
          >
            <Ionicons name="book-outline" size={40} color={colors.white} />
          </Pressable>
          <Text style={styles.label}>Diário Emocional</Text>
        </View>

        <View style={styles.shortcut}>
          <Pressable
            onPress={onOpenSleep}
            accessibilityRole="button"
            accessibilityLabel="Abrir Sono"
            style={({ pressed }) => [styles.iconButton, pressed ? styles.pressed : undefined]}
          >
            <Ionicons name="moon-outline" size={40} color={colors.white} />
          </Pressable>
          <Text style={styles.label}>Sono</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 36,
  },
  shortcut: {
    alignItems: 'center',
  },
  iconButton: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.primaryGreen,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    shadowColor: colors.primaryGreenDark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  pressed: {
    opacity: 0.8,
  },
  label: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
  },
});
