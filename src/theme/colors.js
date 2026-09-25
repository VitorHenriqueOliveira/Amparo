import { Platform } from 'react-native';

export const colors = {
  darkest: '#0c2006',
  darker: '#12310a',
  dark: '#1c4a0f',
  mid: '#3d7a1c',
  midSolid: '#4b8a1f',
  light: '#8bc34a',
  lighter: '#c8e6a0',
  lightest: '#e8f5d8',

  bgTop: '#cfe8a3',
  bgBottom: '#5a9c2b',

  skyTop: '#7ec8f0',
  skyMid: '#a9d9a0',
  skyBottom: '#5a9c2b',

  pillGreen: '#4b8a1f',
  white: '#ffffff',
  textOnDark: '#f4f9ec',
  textMuted: 'rgba(244,249,236,0.75)',
  textDark: '#1c2a10',

  moodHappy: '#f5a623',
  moodSad: '#6ea8ff',
  moodNeutral: '#1e3a8a',
  moodAngry: '#9fb0c0',

  pieHappy: '#9CCC65',
  pieNeutral: '#7CB342',
  pieAngry: '#33691E',
  pieSad: '#1B3A0A',
};

export const serif = Platform.select({
  ios: 'Georgia',
  android: 'serif',
  default: 'Georgia',
});

export const shadow = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.25,
  shadowRadius: 8,
  elevation: 4,
};
