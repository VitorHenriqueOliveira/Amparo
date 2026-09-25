import { Stack } from 'expo-router';
import { AppDataProvider } from '../context/AppDataContext';

export default function RootLayout() {
  return (
    <AppDataProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="home" />
        <Stack.Screen name="diario" />
        <Stack.Screen name="registro-emocional" />
        <Stack.Screen name="sono" />
        <Stack.Screen name="respiracao" />
        <Stack.Screen name="grafico" />
        <Stack.Screen name="perfil" />
      </Stack>
    </AppDataProvider>
  );
}
