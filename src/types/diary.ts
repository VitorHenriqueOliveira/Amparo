// src/types/diary.ts

/**
 * Representa um registro do Diário Emocional.
 * Estrutura preparada para futura persistência no Firebase (Firestore).
 */
export interface EmotionalDiaryEntry {
  id?: string;
  mood: MoodKey;
  note: string;
  createdAt: Date;
}

/**
 * Chaves possíveis de humor, representadas por um tema de clima
 * (sol, nuvem de chuva, tempestade, lua).
 */
export type MoodKey = 'feliz' | 'triste' | 'raiva' | 'neutro';
