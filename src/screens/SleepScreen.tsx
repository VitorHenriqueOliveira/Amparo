// src/screens/SleepScreen.tsx
import React, { useMemo, useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeInDown,
  FadeOutUp,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';

import FactorChip from '../components/FactorChip';
import TimeField from '../components/TimeField';
import SaveButton from '../components/SaveButton';

import { colors } from '../constants/diary';
import { sleepGoalPresets, defaultSleepGoal, defaultBedTime, defaultWakeTime } from '../constants/sleep';
import { SleepEntry } from '../types/sleep';
import { computeSleepDurationMinutes, formatDuration } from '../utils/time';

interface SleepScreenProps {
  onGoBack?: () => void;
  onOpenProfile?: () => void;
}

export default function SleepScreen({ onGoBack, onOpenProfile }: SleepScreenProps) {
  const [bedTime, setBedTime] = useState(defaultBedTime);
  const [wakeTime, setWakeTime] = useState(defaultWakeTime);
  const [selectedGoalKey, setSelectedGoalKey] = useState(defaultSleepGoal.key);
  const [showSuccess, setShowSuccess] = useState(false);

  const successTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
    };
  }, []);

  const selectedGoal = sleepGoalPresets.find((g) => g.key === selectedGoalKey) ?? defaultSleepGoal;

  const durationMinutes = useMemo(
    () => computeSleepDurationMinutes(bedTime, wakeTime),
    [bedTime, wakeTime]
  );

  const goalMinMinutes = selectedGoal.minHours * 60;
  const goalMaxMinutes = selectedGoal.maxHours * 60;

  const status = useMemo(() => {
    if (durationMinutes === null) return null;
    if (durationMinutes < goalMinMinutes) {
      return { label: 'Descanso insuficiente', tone: 'warning' as const };
    }
    if (durationMinutes > goalMaxMinutes + 120) {
      return { label: 'Você dormiu bastante', tone: 'info' as const };
    }
    return { label: 'Sono saudável', tone: 'healthy' as const };
  }, [durationMinutes, goalMinMinutes, goalMaxMinutes]);

  // Escala da barra de progresso: um pouco além da meta máxima, para dar espaço visual.
  const progressScaleMinutes = (selectedGoal.maxHours + 2) * 60;
  const progressRatio = durationMinutes
    ? Math.min(durationMinutes / progressScaleMinutes, 1)
    : 0;

  // Anima o preenchimento da barra suavemente sempre que a proporção mudar,
  // em vez de "pular" direto para o novo valor.
  const progressWidth = useSharedValue(0);
  useEffect(() => {
    progressWidth.value = withTiming(progressRatio * 100, { duration: 450 });
  }, [progressRatio]);
  const progressAnimatedStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%`,
  }));

  function handleSaveEntry() {
    if (durationMinutes === null) return;

    const entry: SleepEntry = {
      bedTime,
      wakeTime,
      durationMinutes,
      goalMinHours: selectedGoal.minHours,
      goalMaxHours: selectedGoal.maxHours,
      createdAt: new Date(),
    };

    // TODO (futuro): substituir o bloco abaixo pela chamada real ao Firebase, ex:
    // await addDoc(collection(db, 'sleepEntries'), entry);
    console.log('Registro de sono pronto para salvar:', entry);

    setShowSuccess(true);
    successTimeoutRef.current = setTimeout(() => setShowSuccess(false), 2000);
  }

  const statusColors = {
    healthy: { bg: colors.veryLightGreen, text: colors.primaryGreen },
    warning: { bg: '#F5E6D8', text: '#8A5A2B' },
    info: { bg: colors.veryLightGreen, text: colors.textPrimary },
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {/* Cabeçalho */}
      <View style={styles.header}>
        <Pressable
          onPress={onGoBack}
          accessibilityRole="button"
          accessibilityLabel="Voltar"
          hitSlop={12}
          style={styles.headerButton}
        >
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Sono</Text>
        <Pressable
          onPress={onOpenProfile}
          accessibilityRole="button"
          accessibilityLabel="Abrir perfil"
          hitSlop={12}
          style={styles.headerButton}
        >
          <Ionicons name="person-circle-outline" size={26} color={colors.textPrimary} />
        </Pressable>
      </View>

      {showSuccess ? (
        <Animated.View
          entering={FadeInDown.duration(280)}
          exiting={FadeOutUp.duration(220)}
          style={styles.successBanner}
        >
          <Ionicons name="checkmark-circle" size={20} color={colors.white} />
          <Text style={styles.successText}>Registro de sono salvo</Text>
        </Animated.View>
      ) : null}

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Card principal: duração e status */}
        <Animated.View entering={FadeInDown.duration(400).delay(60)} style={styles.mainCard}>
          <View style={styles.moonCircle}>
            <Ionicons name="moon" size={44} color={colors.white} />
          </View>
          <Text style={styles.durationText}>
            {durationMinutes !== null ? formatDuration(durationMinutes) : '--'}
          </Text>
          <Text style={styles.durationLabel}>Tempo de sono</Text>

          {status ? (
            <View style={[styles.statusBadge, { backgroundColor: statusColors[status.tone].bg }]}>
              <Ionicons
                name={status.tone === 'warning' ? 'moon-outline' : 'checkmark-circle'}
                size={16}
                color={statusColors[status.tone].text}
              />
              <Text style={[styles.statusText, { color: statusColors[status.tone].text }]}>
                {status.label}
              </Text>
            </View>
          ) : null}
        </Animated.View>

        {/* Meta de sono */}
        <Animated.View entering={FadeInDown.duration(400).delay(140)} style={styles.card}>
          <Text style={styles.cardTitle}>Sua meta</Text>
          <Text style={styles.cardSubtitle}>Meta {selectedGoal.label} de sono</Text>

          <View style={styles.goalChipsRow}>
            {sleepGoalPresets.map((preset) => (
              <FactorChip
                key={preset.key}
                label={preset.label}
                selected={selectedGoalKey === preset.key}
                onPress={() => setSelectedGoalKey(preset.key)}
              />
            ))}
          </View>

          <View style={styles.progressTrack}>
            <Animated.View style={[styles.progressFill, progressAnimatedStyle]} />
          </View>
          <View style={styles.progressLabels}>
            <Text style={styles.progressLabelText}>0h</Text>
            <Text style={styles.progressLabelText}>{selectedGoal.maxHours + 2}h</Text>
          </View>
        </Animated.View>

        {/* Horários */}
        <Animated.View entering={FadeInDown.duration(400).delay(220)} style={styles.card}>
          <View style={styles.timeRow}>
            <TimeField icon="moon-outline" label="Hora de dormir" value={bedTime} onChange={setBedTime} />
            <View style={styles.timeDivider} />
            <TimeField icon="sunny-outline" label="Hora de acordar" value={wakeTime} onChange={setWakeTime} />
          </View>
        </Animated.View>

        {/* Botão de salvar */}
        <View style={styles.saveButtonWrapper}>
          <SaveButton label="Salvar registro" disabled={durationMinutes === null} onPress={handleSaveEntry} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.2,
    color: colors.textPrimary,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryGreen,
    marginHorizontal: 20,
    marginBottom: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 14,
    gap: 8,
  },
  successText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  mainCard: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 20,
    paddingVertical: 28,
    paddingHorizontal: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  moonCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.primaryGreen,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: colors.primaryGreenDark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  durationText: {
    fontSize: 30,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  durationLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
    marginBottom: 14,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 6,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '700',
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  goalChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 14,
  },
  progressTrack: {
    height: 10,
    borderRadius: 6,
    backgroundColor: colors.veryLightGreen,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 6,
    backgroundColor: colors.primaryGreen,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  progressLabelText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  timeDivider: {
    width: 1,
    height: 70,
    backgroundColor: colors.border,
    marginTop: 8,
  },
  saveButtonWrapper: {
    marginTop: 4,
  },
});
