// src/constants/sleep.ts
import { SleepGoalPreset } from '../types/sleep';

/**
 * Opções pré-definidas de meta de sono, em faixas de horas.
 * O usuário escolhe uma faixa em vez de digitar números soltos,
 * o que evita metas irreais e mantém a tela simples de usar.
 */
export const sleepGoalPresets: SleepGoalPreset[] = [
  { key: '6-7', label: '6–7h', minHours: 6, maxHours: 7 },
  { key: '7-8', label: '7–8h', minHours: 7, maxHours: 8 },
  { key: '8-9', label: '8–9h', minHours: 8, maxHours: 9 },
  { key: '9-10', label: '9–10h', minHours: 9, maxHours: 10 },
];

/** Meta padrão sugerida, com base nas recomendações gerais de sono para jovens adultos. */
export const defaultSleepGoal: SleepGoalPreset = sleepGoalPresets[1]; // 7–8h

/** Horários padrão exibidos antes do primeiro registro do usuário. */
export const defaultBedTime = '22:30';
export const defaultWakeTime = '06:30';
