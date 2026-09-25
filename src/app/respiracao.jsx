import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View, Pressable, SafeAreaView, Animated } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import ScreenBackground from '../components/ScreenBackground';
import ScreenHeader from '../components/ScreenHeader';
import BottomNav from '../components/BottomNav';
import { colors, serif } from '../theme/colors';

// Simple two-phase breathing cycle: inhale, then exhale.
const PHASES = [
  { key: 'Inspire', seconds: 4 },
  { key: 'Expire', seconds: 4 },
];

export default function Respiracao() {
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(PHASES[0].seconds);
  const [paused, setPaused] = useState(false);
  const scale = useRef(new Animated.Value(1)).current;

  // Countdown ticker — advances the phase when it reaches zero.
  useEffect(() => {
    if (paused) return undefined;
    const id = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev > 1) return prev - 1;
        setPhaseIndex((p) => (p + 1) % PHASES.length);
        return null; // placeholder, real value set by the phase effect below
      });
    }, 1000);
    return () => clearInterval(id);
  }, [paused]);

  // Whenever the phase changes, reset the countdown and animate the circle.
  useEffect(() => {
    setSecondsLeft(PHASES[phaseIndex].seconds);
    const isInspire = PHASES[phaseIndex].key === 'Inspire';
    if (!paused) {
      Animated.timing(scale, {
        toValue: isInspire ? 1.12 : 0.9,
        duration: PHASES[phaseIndex].seconds * 1000,
        useNativeDriver: true,
      }).start();
    }
  }, [phaseIndex]);

  const togglePause = () => {
    setPaused((p) => {
      const next = !p;
      if (next) {
        scale.stopAnimation();
      } else {
        const isInspire = PHASES[phaseIndex].key === 'Inspire';
        Animated.timing(scale, {
          toValue: isInspire ? 1.12 : 0.9,
          duration: secondsLeft * 1000,
          useNativeDriver: true,
        }).start();
      }
      return next;
    });
  };

  const phase = PHASES[phaseIndex];

  return (
    <View style={{ flex: 1 }}>
      <ScreenBackground variant="light">
        <SafeAreaView style={{ flex: 1 }}>
          <ScreenHeader title="Modo calma urgente" />

          <View style={styles.body}>
            <MaterialCommunityIcons
              name="weather-windy"
              size={56}
              color="#2f5f1a"
              style={styles.windIcon}
            />
            <Text style={styles.title}>Modo Calma Urgente</Text>

            <View style={styles.ringOuter}>
              <View style={styles.ringDot} />
              <Animated.View style={[styles.circle, { transform: [{ scale }] }]}>
                <Text style={styles.phaseLabel}>{phase.key}</Text>
                <Text style={styles.countNumber}>{secondsLeft ?? phase.seconds}</Text>
                <Text style={styles.phaseLabel}>Segundos</Text>
              </Animated.View>
            </View>

            <Text style={styles.subtitle}>Respire, você está seguro.</Text>

            <Pressable style={styles.pauseBtn} onPress={togglePause}>
              <View style={styles.pauseIconCircle}>
                <Ionicons name={paused ? 'play' : 'pause'} size={16} color={colors.dark} />
              </View>
              <Text style={styles.pauseText}>{paused ? 'Continuar' : 'Pausar'}</Text>
            </Pressable>
          </View>

          <BottomNav active="respiracao" />
        </SafeAreaView>
      </ScreenBackground>
    </View>
  );
}

const CIRCLE_SIZE = 260;
const RING_SIZE = CIRCLE_SIZE + 36;

const styles = StyleSheet.create({
  body: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  windIcon: {
    marginBottom: 8,
  },
  title: {
    fontFamily: serif,
    fontSize: 20,
    fontWeight: '700',
    color: '#1c2a10',
    marginBottom: 28,
  },
  ringOuter: {
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: 2,
    borderColor: colors.dark,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 26,
  },
  ringDot: {
    position: 'absolute',
    top: -6,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.dark,
  },
  circle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    backgroundColor: colors.dark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  phaseLabel: {
    color: colors.white,
    fontFamily: serif,
    fontSize: 20,
  },
  countNumber: {
    color: colors.white,
    fontFamily: serif,
    fontSize: 64,
    fontWeight: '700',
    lineHeight: 76,
  },
  subtitle: {
    fontFamily: serif,
    fontSize: 17,
    color: '#1c2a10',
    marginBottom: 20,
  },
  pauseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.darker,
    borderRadius: 26,
    paddingVertical: 10,
    paddingHorizontal: 22,
    marginBottom: 20,
  },
  pauseIconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.lightest,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pauseText: {
    color: colors.white,
    fontFamily: serif,
    fontSize: 17,
  },
});
