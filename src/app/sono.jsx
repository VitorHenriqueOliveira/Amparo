import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View, Pressable, SafeAreaView, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenBackground from '../components/ScreenBackground';
import ScreenHeader from '../components/ScreenHeader';
import BottomNav from '../components/BottomNav';
import { colors, serif, shadow } from '../theme/colors';
import { useAppData } from '../context/AppDataContext';

const GOAL_MIN_HOURS = 7;
const GOAL_MAX_HOURS = 8;
const CHART_MAX_HOURS = 8;

function diffInHoursMinutes(bedtime, wake) {
  const [bh, bm] = bedtime.split(':').map(Number);
  const [wh, wm] = wake.split(':').map(Number);
  let start = bh * 60 + bm;
  let end = wh * 60 + wm;
  if (end <= start) end += 24 * 60;
  const totalMinutes = end - start;
  return { hours: Math.floor(totalMinutes / 60), minutes: totalMinutes % 60, totalMinutes };
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

// Small "hh : mm" stepper used inside the edit modal.
function TimeStepper({ label, hour, minute, onChangeHour, onChangeMinute }) {
  return (
    <View style={stepperStyles.wrap}>
      <Text style={stepperStyles.label}>{label}</Text>
      <View style={stepperStyles.row}>
        <View style={stepperStyles.unit}>
          <Pressable onPress={() => onChangeHour((hour + 1) % 24)} style={stepperStyles.btn}>
            <Ionicons name="chevron-up" size={18} color={colors.white} />
          </Pressable>
          <Text style={stepperStyles.value}>{String(hour).padStart(2, '0')}</Text>
          <Pressable onPress={() => onChangeHour((hour + 23) % 24)} style={stepperStyles.btn}>
            <Ionicons name="chevron-down" size={18} color={colors.white} />
          </Pressable>
        </View>
        <Text style={stepperStyles.colon}>:</Text>
        <View style={stepperStyles.unit}>
          <Pressable onPress={() => onChangeMinute((minute + 5) % 60)} style={stepperStyles.btn}>
            <Ionicons name="chevron-up" size={18} color={colors.white} />
          </Pressable>
          <Text style={stepperStyles.value}>{String(minute).padStart(2, '0')}</Text>
          <Pressable onPress={() => onChangeMinute((minute + 55) % 60)} style={stepperStyles.btn}>
            <Ionicons name="chevron-down" size={18} color={colors.white} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

export default function Sono() {
  const { sleepSettings, setSleepSettings } = useAppData();
  const { bedtime, wakeTime } = sleepSettings;

  const [editorOpen, setEditorOpen] = useState(false);
  const [draftBedH, setDraftBedH] = useState(22);
  const [draftBedM, setDraftBedM] = useState(30);
  const [draftWakeH, setDraftWakeH] = useState(6);
  const [draftWakeM, setDraftWakeM] = useState(30);

  const { hours, minutes, totalMinutes } = useMemo(
    () => diffInHoursMinutes(bedtime, wakeTime),
    [bedtime, wakeTime]
  );

  const totalHoursDecimal = totalMinutes / 60;
  const isAdequate = totalHoursDecimal >= GOAL_MIN_HOURS;
  const progress = clamp(totalHoursDecimal / CHART_MAX_HOURS, 0, 1);

  const openEditor = () => {
    const [bh, bm] = bedtime.split(':').map(Number);
    const [wh, wm] = wakeTime.split(':').map(Number);
    setDraftBedH(bh);
    setDraftBedM(bm);
    setDraftWakeH(wh);
    setDraftWakeM(wm);
    setEditorOpen(true);
  };

  const saveEditor = () => {
    setSleepSettings({
      bedtime: `${String(draftBedH).padStart(2, '0')}:${String(draftBedM).padStart(2, '0')}`,
      wakeTime: `${String(draftWakeH).padStart(2, '0')}:${String(draftWakeM).padStart(2, '0')}`,
    });
    setEditorOpen(false);
  };

  return (
    <View style={{ flex: 1 }}>
      <ScreenBackground variant="light">
        <SafeAreaView style={{ flex: 1 }}>
          <ScreenHeader title="Sono" />

          <View style={styles.body}>
            <View style={[styles.card, styles.mainCard, shadow]}>
              <View style={styles.moonCircle}>
                <Ionicons name="moon" size={40} color={colors.white} />
              </View>

              <Text style={styles.hoursText}>
                {hours}h{minutes > 0 ? `${minutes.toString().padStart(2, '0')}min` : ''}
              </Text>
              <Text style={styles.hoursLabel}>Tempo de sono</Text>

              <View style={[styles.statusPill, isAdequate ? styles.statusOk : styles.statusWarn]}>
                <Ionicons
                  name={isAdequate ? 'checkmark-circle' : 'moon'}
                  size={16}
                  color={colors.white}
                />
                <Text style={styles.statusText}>
                  {isAdequate ? 'Descanso Adequado' : 'Descanso insuficiente'}
                </Text>
              </View>
            </View>

            <View style={[styles.card, shadow]}>
              <Text style={styles.goalTitle}>Sua meta</Text>
              <Text style={styles.goalSubtitle}>
                Meta {GOAL_MIN_HOURS} a {GOAL_MAX_HOURS} horas de sono
              </Text>

              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
              </View>
              <View style={styles.progressLabels}>
                <Text style={styles.progressLabelText}>0h</Text>
                <Text style={styles.progressLabelText}>{CHART_MAX_HOURS}h</Text>
              </View>
            </View>

            <View style={[styles.card, styles.timesCard, shadow]}>
              <View style={styles.timeBlock}>
                <Ionicons name="moon-outline" size={20} color={colors.white} />
                <Text style={styles.timeLabel}>Hora de dormir</Text>
                <Text style={styles.timeValue}>{bedtime}</Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.timeBlock}>
                <Ionicons name="sunny-outline" size={20} color={colors.white} />
                <Text style={styles.timeLabel}>Hora de acordar</Text>
                <Text style={styles.timeValue}>{wakeTime}</Text>
              </View>
            </View>

            <Pressable style={[styles.editBtnFull, shadow]} onPress={openEditor}>
              <Ionicons name="create-outline" size={16} color={colors.white} />
              <Text style={styles.editBtnFullText}>Editar horários</Text>
            </Pressable>
          </View>

          <BottomNav active="sono" />

          <Modal visible={editorOpen} transparent animationType="fade" onRequestClose={() => setEditorOpen(false)}>
            <View style={styles.modalOverlay}>
              <View style={styles.modalCard}>
                <Text style={styles.modalTitle}>Editar horários</Text>

                <TimeStepper
                  label="Hora de dormir"
                  hour={draftBedH}
                  minute={draftBedM}
                  onChangeHour={setDraftBedH}
                  onChangeMinute={setDraftBedM}
                />
                <TimeStepper
                  label="Hora de acordar"
                  hour={draftWakeH}
                  minute={draftWakeM}
                  onChangeHour={setDraftWakeH}
                  onChangeMinute={setDraftWakeM}
                />

                <View style={styles.modalActions}>
                  <Pressable
                    style={[styles.modalActionBtn, styles.modalCancel]}
                    onPress={() => setEditorOpen(false)}
                  >
                    <Text style={styles.modalActionText}>Cancelar</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.modalActionBtn, styles.modalSave]}
                    onPress={saveEditor}
                  >
                    <Text style={styles.modalActionText}>Salvar</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </Modal>
        </SafeAreaView>
      </ScreenBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    paddingHorizontal: 16,
    gap: 16,
  },
  card: {
    backgroundColor: colors.darker,
    borderRadius: 24,
    padding: 20,
  },
  mainCard: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  moonCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.mid,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
  },
  hoursText: {
    color: colors.white,
    fontFamily: serif,
    fontSize: 32,
    fontWeight: '700',
  },
  hoursLabel: {
    color: colors.textMuted,
    fontSize: 14,
    marginTop: 2,
    marginBottom: 18,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 22,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  statusOk: {
    backgroundColor: '#3f8f1f',
  },
  statusWarn: {
    backgroundColor: colors.pillGreen,
  },
  statusText: {
    color: colors.white,
    fontWeight: '600',
    fontSize: 14,
  },
  goalTitle: {
    color: colors.white,
    fontFamily: serif,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  goalSubtitle: {
    color: colors.textMuted,
    fontSize: 13,
    marginBottom: 16,
  },
  progressTrack: {
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.dark,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.light,
    borderRadius: 6,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  progressLabelText: {
    color: colors.textMuted,
    fontSize: 12,
  },
  timesCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeBlock: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  timeLabel: {
    color: colors.textMuted,
    fontSize: 12,
  },
  timeValue: {
    color: colors.white,
    fontFamily: serif,
    fontSize: 22,
    fontWeight: '700',
  },
  divider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginHorizontal: 8,
  },
  editBtnFull: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.pillGreen,
    borderRadius: 20,
    paddingVertical: 14,
  },
  editBtnFullText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    backgroundColor: colors.darker,
    borderRadius: 24,
    paddingVertical: 26,
    paddingHorizontal: 24,
  },
  modalTitle: {
    color: colors.white,
    fontFamily: serif,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  modalActionBtn: {
    flex: 1,
    borderRadius: 18,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCancel: {
    backgroundColor: colors.mid,
  },
  modalSave: {
    backgroundColor: colors.pillGreen,
  },
  modalActionText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 14,
  },
});

const stepperStyles = StyleSheet.create({
  wrap: {
    marginBottom: 18,
  },
  label: {
    color: colors.textMuted,
    fontSize: 13,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  unit: {
    alignItems: 'center',
    backgroundColor: colors.dark,
    borderRadius: 14,
    paddingVertical: 6,
    width: 64,
  },
  btn: {
    padding: 4,
  },
  value: {
    color: colors.white,
    fontFamily: serif,
    fontSize: 22,
    fontWeight: '700',
    marginVertical: 2,
  },
  colon: {
    color: colors.white,
    fontSize: 22,
    fontWeight: '700',
  },
});
