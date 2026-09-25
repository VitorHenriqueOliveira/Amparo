import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme/colors';

/**
 * "sky"  = blue sky -> green grass (Bem-vindo / onboarding)
 * "login" = pale green radial (Login)
 * "light" = pale green top -> mid green bottom (every app screen)
 */
export default function ScreenBackground({ children, variant = 'light', style }) {
  const colorsArr =
    variant === 'sky'
      ? [colors.skyTop, colors.skyMid, colors.skyBottom]
      : variant === 'login'
      ? [colors.lightest, colors.light, colors.midSolid]
      : [colors.bgTop, colors.bgBottom];

  return (
    <LinearGradient colors={colorsArr} style={[StyleSheet.absoluteFill, style]}>
      <View style={styles.dotOverlay} pointerEvents="none" />
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  dotOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.04,
  },
});
