import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View, Pressable, SafeAreaView, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import ScreenBackground from '../components/ScreenBackground';
import ScreenHeader from '../components/ScreenHeader';
import BottomNav from '../components/BottomNav';
import PieChart from '../components/PieChart';
import { colors, serif, shadow } from '../theme/colors';
import { useAppData } from '../context/AppDataContext';

const PERIODS = ['Dia', 'Semana', 'Mês'];
const MOOD_COLOR = {
  Feliz: colors.pieHappy,
  Neutro: colors.pieNeutral,
  Raiva: colors.pieAngry,
  Triste: colors.pieSad,
};
const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function withinPeriod(dateISO, period) {
  const date = new Date(dateISO + 'T00:00:00');
  const now = new Date();
  if (period === 'Dia') {
    return dateISO === now.toISOString().slice(0, 10);
  }
  if (period === 'Semana') {
    const weekAgo = new Date(now);
    weekAgo.setDate(now.getDate() - 6);
    return date >= new Date(weekAgo.toDateString());
  }
  // Mês
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
}

export default function Grafico() {
  const { moodEntries, sleepSettings } = useAppData();
  const [period, setPeriod] = useState('Mês');
  const [filterOpen, setFilterOpen] = useState(false);

  const filtered = useMemo(
    () => moodEntries.filter((e) => withinPeriod(e.date, period)),
    [moodEntries, period]
  );

  const pieData = useMemo(() => {
    if (filtered.length === 0) return [];
    const counts = {};
    filtered.forEach((e) => {
      counts[e.mood] = (counts[e.mood] || 0) + 1;
    });
    return Object.entries(counts).map(([label, count]) => ({
      label,
      value: Math.round((count / filtered.length) * 100),
      color: MOOD_COLOR[label] || colors.pieNeutral,
    }));
  }, [filtered]);

  const topMood = useMemo(() => {
    if (pieData.length === 0) return null;
    return [...pieData].sort((a, b) => b.value - a.value)[0];
  }, [pieData]);

  // Sleep insight based on the current sleep goal setting.
  const sleepInsight = useMemo(() => {
    const [bh, bm] = sleepSettings.bedtime.split(':').map(Number);
    const [wh, wm] = sleepSettings.wakeTime.split(':').map(Number);
    let start = bh * 60 + bm;
    let end = wh * 60 + wm;
    if (end <= start) end += 24 * 60;
    const hours = (end - start) / 60;
    const deficit = 7 - hours;
    return { hours, deficit };
  }, [sleepSettings]);

  const now = new Date();
  const periodLabel =
    period === 'Dia'
      ? 'Seu dia de hoje'
      : period === 'Semana'
      ? 'Sua semana'
      : `Seu mês de ${MONTH_NAMES[now.getMonth()]}`;

  return (
    <View style={{ flex: 1 }}>
      <ScreenBackground variant="light">
        <SafeAreaView style={{ flex: 1 }}>
          <ScreenHeader title="Evolução emocional" />

          <ScrollView contentContainerStyle={styles.scroll}>
            <View style={styles.filterRow}>
              <View style={[styles.filterPill, shadow]}>
                <Text style={styles.filterPillText}>{periodLabel}</Text>
              </View>

              <View>
                <Pressable
                  style={[styles.filterBtn, shadow]}
                  onPress={() => setFilterOpen((v) => !v)}
                >
                  <Text style={styles.filterBtnText}>Filtrar</Text>
                  <Ionicons
                    name={filterOpen ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color={colors.white}
                  />
                </Pressable>

                {filterOpen && (
                  <View style={[styles.dropdown, shadow]}>
                    {PERIODS.map((p) => (
                      <Pressable
                        key={p}
                        style={styles.dropdownItem}
                        onPress={() => {
                          setPeriod(p);
                          setFilterOpen(false);
                        }}
                      >
                        <Text
                          style={[
                            styles.dropdownItemText,
                            p === period && styles.dropdownItemTextActive,
                          ]}
                        >
                          {p}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>
            </View>

            {pieData.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="analytics-outline" size={40} color={colors.mid} />
                <Text style={styles.emptyText}>
                  Ainda não há registros de humor neste período.
                </Text>
                <Pressable
                  style={styles.emptyBtn}
                  onPress={() => router.push('/registro-emocional')}
                >
                  <Text style={styles.emptyBtnText}>Registrar como estou me sentindo</Text>
                </Pressable>
              </View>
            ) : (
              <>
                <View style={styles.chartWrap}>
                  <PieChart data={pieData} size={240} />
                </View>

                <View style={[styles.insightCard, shadow]}>
                  <Ionicons name="rainy" size={26} color="#6ea8ff" style={styles.insightIcon} />
                  <Text style={styles.insightText}>
                    {topMood
                      ? `Neste período você se sentiu mais "${topMood.label}" (${topMood.value}%). Que tal tirar 5 minutos para o Modo Calma Urgente ou escrever no diário sobre isso?`
                      : 'Continue registrando seu humor para ver seus padrões aqui.'}
                  </Text>
                </View>

                <View style={[styles.insightCard, shadow]}>
                  <Ionicons
                    name={sleepInsight.deficit > 0 ? 'warning' : 'checkmark-circle'}
                    size={22}
                    color={sleepInsight.deficit > 0 ? '#f5c518' : '#8bc34a'}
                    style={styles.insightIcon}
                  />
                  <Text style={styles.insightText}>
                    {sleepInsight.deficit > 0
                      ? `Seu horário atual de sono rende ${sleepInsight.hours.toFixed(1)}h — cerca de ${sleepInsight.deficit.toFixed(1)}h abaixo da meta de 7h. Isso pode intensificar tristeza e irritação.`
                      : `Seu horário atual de sono rende ${sleepInsight.hours.toFixed(1)}h — dentro da meta. Continue assim!`}
                  </Text>
                </View>
              </>
            )}
          </ScrollView>

          <BottomNav active="grafico" />
        </SafeAreaView>
      </ScreenBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  filterPill: {
    backgroundColor: colors.darker,
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
  filterPillText: {
    color: colors.white,
    fontFamily: serif,
    fontSize: 15,
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.darker,
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  filterBtnText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  dropdown: {
    position: 'absolute',
    top: 46,
    right: 0,
    backgroundColor: colors.mid,
    borderRadius: 16,
    paddingVertical: 8,
    minWidth: 110,
    zIndex: 10,
  },
  dropdownItem: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  dropdownItemText: {
    color: colors.textOnDark,
    fontSize: 14,
  },
  dropdownItemTextActive: {
    fontWeight: '700',
    color: colors.white,
  },
  chartWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 24,
  },
  insightCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: colors.darker,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
  },
  insightIcon: {
    marginTop: 2,
  },
  insightText: {
    flex: 1,
    color: colors.white,
    fontSize: 13,
    lineHeight: 19,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 50,
    paddingHorizontal: 30,
    gap: 14,
  },
  emptyText: {
    color: colors.dark,
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
  },
  emptyBtn: {
    backgroundColor: colors.pillGreen,
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  emptyBtnText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 13,
  },
});
