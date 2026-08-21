// src/components/MoodOption.tsx
import React, { useEffect } from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { colors } from '../constants/diary';

interface MoodOptionProps {
  emoji: string;
  label: string;
  selected: boolean;
  onPress: () => void;
}

/**
 * Representa uma opção de humor (emoji + rótulo em texto).
 * O texto sempre acompanha o emoji para garantir acessibilidade,
 * já que o emoji sozinho não deve ser a única forma de identificação.
 *
 * Quando selecionada, o item dá um pequeno "bounce" para reforçar
 * visualmente a escolha do usuário.
 */
export default function MoodOption({ emoji, label, selected, onPress }: MoodOptionProps) {
  const scale = useSharedValue(1);

  useEffect(() => {
    if (selected) {
      scale.value = withSequence(
        withTiming(1.15, { duration: 120 }),
        withTiming(1, { duration: 140 })
      );
    }
  }, [selected]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.wrapper, animatedStyle]}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`Selecionar humor: ${label}`}
        accessibilityState={{ selected }}
        style={({ pressed }) => [
          styles.container,
          selected ? styles.selectedContainer : undefined,
          pressed ? styles.pressed : undefined,
        ]}
      >
        <Text style={styles.emoji}>{emoji}</Text>
        <Text style={[styles.label, selected ? styles.selectedLabel : undefined]}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    marginHorizontal: 4,
  },
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 16,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.border,
    minHeight: 76,
  },
  selectedContainer: {
    backgroundColor: colors.veryLightGreen,
    borderColor: colors.primaryGreen,
  },
  pressed: {
    opacity: 0.8,
  },
  emoji: {
    fontSize: 26,
    marginBottom: 4,
  },
  label: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  selectedLabel: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
});
