// src/components/HomeShortcutButton.tsx
import React from 'react';
import { Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  FadeInDown,
} from 'react-native-reanimated';
import { colors } from '../constants/diary';

interface HomeShortcutButtonProps {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
  /** Atraso (em ms) antes da animação de entrada começar, para criar um efeito escalonado. */
  entranceDelay?: number;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Botão circular de atalho usado na Home (ex.: Diário Emocional, Sono).
 * Encolhe suavemente ao ser pressionado e entra na tela com um leve
 * deslizar + fade, escalonado por entranceDelay para dar mais vida à Home.
 */
export default function HomeShortcutButton({
  icon,
  label,
  onPress,
  entranceDelay = 0,
}: HomeShortcutButtonProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  function handlePressIn() {
    scale.value = withTiming(0.92, { duration: 100 });
  }

  function handlePressOut() {
    scale.value = withTiming(1, { duration: 150 });
  }

  return (
    <Animated.View
      entering={FadeInDown.duration(400).delay(entranceDelay)}
      style={styles.shortcut}
    >
      <AnimatedPressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessibilityRole="button"
        accessibilityLabel={`Abrir ${label}`}
        style={[styles.iconButton, animatedStyle]}
      >
        <Ionicons name={icon} size={40} color={colors.white} />
      </AnimatedPressable>
      <Text style={styles.label}>{label}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
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
  label: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
  },
});
