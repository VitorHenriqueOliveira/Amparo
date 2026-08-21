// src/utils/time.ts

/**
 * Converte um horário "HH:mm" em minutos desde a meia-noite.
 * Retorna null se o formato for inválido.
 */
export function parseTimeToMinutes(value: string): number | null {
  const match = /^([0-1]?\d|2[0-3]):([0-5]\d)$/.exec(value.trim());
  if (!match) return null;
  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  return hours * 60 + minutes;
}

/**
 * Calcula a duração do sono em minutos a partir do horário de dormir e acordar.
 * Lida corretamente com sono que passa da meia-noite
 * (ex.: dormir 22:30, acordar 06:30 → 8h, não um número negativo).
 */
export function computeSleepDurationMinutes(bedTime: string, wakeTime: string): number | null {
  const bedMinutes = parseTimeToMinutes(bedTime);
  const wakeMinutes = parseTimeToMinutes(wakeTime);
  if (bedMinutes === null || wakeMinutes === null) return null;

  const duration = wakeMinutes - bedMinutes;
  return duration >= 0 ? duration : duration + 24 * 60;
}

/** Formata minutos totais como "Xh Ymin" (ex.: 210 → "3h30min"). */
export function formatDuration(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes > 0 ? `${hours}h${minutes}min` : `${hours}h`;
}
