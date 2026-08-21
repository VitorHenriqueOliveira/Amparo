// src/types/sleep.ts

/**
 * Representa um registro de sono de um dia.
 * Estrutura preparada para futura persistência no Firebase (Firestore).
 */
export interface SleepEntry {
  id?: string;
  bedTime: string; // formato "HH:mm"
  wakeTime: string; // formato "HH:mm"
  durationMinutes: number;
  goalMinHours: number;
  goalMaxHours: number;
  createdAt: Date;
}

/** Um intervalo de meta de sono selecionável (ex.: "7–8h"). */
export interface SleepGoalPreset {
  key: string;
  label: string;
  minHours: number;
  maxHours: number;
}
