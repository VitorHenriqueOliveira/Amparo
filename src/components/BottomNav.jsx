import React from 'react';
import { StyleSheet, View, Pressable } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router, usePathname } from 'expo-router';
import { colors } from '../theme/colors';

const TABS = [
  {
    key: 'diario',
    route: '/diario',
    render: (c) => <Ionicons name="book-outline" size={22} color={c} />,
  },
  {
    key: 'registro',
    route: '/registro-emocional',
    render: (c) => <Ionicons name="sunny-outline" size={22} color={c} />,
  },
  {
    key: 'sono',
    route: '/sono',
    render: (c) => <Ionicons name="moon-outline" size={22} color={c} />,
  },
  {
    key: 'respiracao',
    route: '/respiracao',
    render: (c) => <MaterialCommunityIcons name="weather-windy" size={22} color={c} />,
  },
  {
    key: 'grafico',
    route: '/grafico',
    render: (c) => <MaterialCommunityIcons name="sprout-outline" size={22} color={c} />,
  },
];

export default function BottomNav({ active }) {
  const pathname = usePathname();

  return (
    <View style={styles.wrap}>
      {TABS.map((tab) => {
        const isActive = tab.key === active;
        return (
          <Pressable
            key={tab.key}
            onPress={() => {
              if (pathname === tab.route) return;
              // replace() keeps the back-stack clean when switching tabs,
              // so the back button always returns to Home reliably.
              router.replace(tab.route);
            }}
            style={[styles.iconCircle, isActive && styles.iconCircleActive]}
          >
            {tab.render(isActive ? colors.dark : colors.lightest)}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.darker,
    borderRadius: 30,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconCircleActive: {
    backgroundColor: colors.lightest,
  },
});
