import React from 'react';
import { StyleSheet, Text, View, Pressable, SafeAreaView, ScrollView } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import ScreenBackground from '../components/ScreenBackground';
import { colors, serif } from '../theme/colors';
import { useAppData } from '../context/AppDataContext';

const BUTTONS = [
  { key: 'diario', label: 'Diário pessoal', route: '/diario', icon: (c) => <Ionicons name="book-outline" size={22} color={c} /> },
  { key: 'registro', label: 'Registro emocional', route: '/registro-emocional', icon: (c) => <Ionicons name="sunny-outline" size={22} color={c} /> },
  { key: 'sono', label: 'Registro de sono', route: '/sono', icon: (c) => <Ionicons name="moon-outline" size={22} color={c} /> },
  { key: 'respiracao', label: 'Modo calma urgente', route: '/respiracao', icon: (c) => <MaterialCommunityIcons name="weather-windy" size={22} color={c} /> },
  { key: 'grafico', label: 'Evolução emocional', route: '/grafico', icon: (c) => <MaterialCommunityIcons name="sprout-outline" size={22} color={c} /> },
];

export default function Home() {
  const { profile, todaysMood } = useAppData();
  const firstName = profile.name?.trim().split(' ')[0] || '';

  return (
    <View style={{ flex: 1 }}>
      <ScreenBackground variant="light">
        <SafeAreaView style={{ flex: 1 }}>
          <View style={styles.headerCard}>
            <View style={styles.headerTop}>
              <View style={{ width: 40 }} />
              <Text style={styles.headerTitle}>Home</Text>
              <Pressable onPress={() => router.push('/perfil')} style={styles.profileCircle}>
                <Ionicons name="person" size={20} color={colors.dark} />
              </Pressable>
            </View>

            <Ionicons name="sunny" size={44} color="#f5c518" style={{ marginTop: 4 }} />
            <Text style={styles.question}>
              {firstName ? `Oi, ${firstName}! ` : ''}
              {todaysMood
                ? 'Você já registrou como está se sentindo hoje. Quer ver algo mais?'
                : 'Quer nos ajudar a contar como você está ou como está seu dia?'}
            </Text>
          </View>

          <ScrollView contentContainerStyle={styles.scroll}>
            {BUTTONS.map((btn) => (
              <Pressable
                key={btn.key}
                style={({ pressed }) => [styles.navBtn, pressed && styles.navBtnPressed]}
                onPress={() => router.push(btn.route)}
              >
                {btn.icon(colors.textOnDark)}
                <Text style={styles.navBtnText}>{btn.label}</Text>
                {btn.key === 'registro' && todaysMood && (
                  <View style={styles.doneBadge}>
                    <Ionicons name="checkmark" size={13} color={colors.dark} />
                  </View>
                )}
              </Pressable>
            ))}
          </ScrollView>
        </SafeAreaView>
      </ScreenBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  headerCard: {
    backgroundColor: colors.darker,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    paddingTop: 12,
    paddingBottom: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 4,
  },
  headerTitle: {
    color: colors.white,
    fontFamily: serif,
    fontSize: 20,
  },
  profileCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.lighter,
    borderWidth: 2,
    borderColor: colors.light,
    justifyContent: 'center',
    alignItems: 'center',
  },
  question: {
    color: colors.white,
    fontFamily: serif,
    fontSize: 15,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 21,
    paddingHorizontal: 10,
  },
  scroll: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 14,
  },
  navBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.dark,
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 20,
  },
  navBtnPressed: {
    opacity: 0.85,
  },
  navBtnText: {
    flex: 1,
    color: colors.textOnDark,
    fontFamily: serif,
    fontSize: 15,
  },
  doneBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.light,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
