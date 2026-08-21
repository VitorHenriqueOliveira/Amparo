// src/components/SaveButton.tsx
import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { colors } from '../constants/diary';

interface SaveButtonProps {
  label: string;
  disabled: boolean;
  onPress: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Botão principal de salvamento. Fica desabilitado (visual e funcionalmente)
 * enquanto nenhum humor tiver sido selecionado.
 *
 * Encolhe suavemente enquanto é pressionado, dando um feedback tátil visual.
 */
export default function SaveButton({ label, disabled, onPress }: SaveButtonProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  function handlePressIn() {
    if (!disabled) {
      scale.value = withTiming(0.96, { duration: 100 });
    }
  }

  function handlePressOut() {
    scale.value = withTiming(1, { duration: 150 });
  }

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      accessibilityLabel={label}
      style={[styles.button, disabled ? styles.buttonDisabled : undefined, animatedStyle]}
    >
      <Text style={[styles.label, disabled ? styles.labelDisabled : undefined]}>{label}</Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.primaryGreen,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primaryGreenDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    backgroundColor: colors.lightGreen,
  },
  label: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  labelDisabled: {
    color: colors.white,
    opacity: 0.85,
  },
});
