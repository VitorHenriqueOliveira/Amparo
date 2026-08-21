// src/constants/diary.ts
import { MoodKey } from '../types/diary';

/**
 * Paleta de cores do Amparo — verde musgo + branco.
 * Mais profunda e com mais presença visual que o verde suave anterior,
 * mantendo a sensação de acolhimento e natureza.
 * Centralizada aqui para facilitar reuso em outras telas futuramente.
 */
export const colors = {
  primaryGreen: '#3F5A3A', // verde musgo — cor de destaque principal
  primaryGreenDark: '#2E4229', // variação mais escura, para pressed states/sombras
  lightGreen: '#8FA876', // verde musgo mais claro, para estados intermediários
  veryLightGreen: '#E3E9DC', // fundo suave para itens selecionados
  white: '#FFFFFF',
  background: '#F6F7F3',
  textPrimary: '#20291D',
  textSecondary: '#5E6B58',
  border: '#D6DCCC',
};

/**
 * Opções de humor exibidas na tela, cada uma com uma descrição curta
 * que ajuda o usuário a reconhecer melhor o que está sentindo.
 */
export interface MoodOptionData {
  key: MoodKey;
  emoji: string;
  label: string;
  description: string;
}

export const moodOptions: MoodOptionData[] = [
  {
    key: 'feliz',
    emoji: '☀️',
    label: 'Feliz',
    description: 'Você está se sentindo bem, animado ou satisfeito com seu dia.',
  },
  {
    key: 'neutro',
    emoji: '🌙',
    label: 'Neutro',
    description: 'Você não está se sentindo especialmente bem ou mal.',
  },
  {
    key: 'triste',
    emoji: '🌧️',
    label: 'Triste',
    description: 'Você está se sentindo para baixo, desanimado ou emocionalmente abalado.',
  },
  {
    key: 'raiva',
    emoji: '⛈️',
    label: 'Raiva',
    description: 'Você está se sentindo irritado, tenso ou incomodado com algo.',
  },
];
