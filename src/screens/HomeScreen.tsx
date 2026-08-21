// src/screens/HomeScreen.tsx
import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';

import HomeShortcutButton from '../components/HomeShortcutButton';
import { colors } from '../constants/diary';

interface HomeScreenProps {
  /** Navega para a tela do Diário Emocional. Injetado pela rota (app/index.tsx). */
  onOpenDiary: () => void;
  /** Navega para a tela de Sono. Injetado pela rota (app/index.tsx). */
  onOpenSleep: () => void;
}

/** Retorna uma saudação de acordo com o horário do dispositivo. */
function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

/**
 * Tela inicial provisória do Amparo.
 * Por enquanto contém apenas os atalhos para o Diário Emocional e o Sono,
 * como pedido — nenhuma outra funcionalidade foi adicionada aqui ainda.
 */
export default function HomeScreen({ onOpenDiary, onOpenSleep }: HomeScreenProps) {
  const greeting = useMemo(() => getGreeting(), []);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {/* Círculos decorativos discretos, só para dar um pouco mais de vida ao fundo */}
      <View pointerEvents="none" style={styles.decorCircleTop} />
      <View pointerEvents="none" style={styles.decorCircleBottom} />

      <Animated.View entering={FadeIn.duration(500)} style={styles.greetingWrapper}>
        <Text style={styles.greeting}>{greeting} 🌿</Text>
        <Text style={styles.greetingSubtitle}>O que você quer registrar agora?</Text>
      </Animated.View>

      <View style={styles.container}>
        <HomeShortcutButton
          icon="book-outline"
          label="Diário Emocional"
          onPress={onOpenDiary}
          entranceDelay={100}
        />
        <HomeShortcutButton
          icon="moon-outline"
          label="Sono"
          onPress={onOpenSleep}
          entranceDelay={220}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  decorCircleTop: {
    position: 'absolute',
    top: -60,
    right: -60,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: colors.veryLightGreen,
    opacity: 0.6,
  },
  decorCircleBottom: {
    position: 'absolute',
    bottom: -80,
    left: -80,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: colors.veryLightGreen,
    opacity: 0.5,
  },
  greetingWrapper: {
    paddingTop: 24,
    paddingHorizontal: 24,
  },
  greeting: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  greetingSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  container: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 36,
  },
});
