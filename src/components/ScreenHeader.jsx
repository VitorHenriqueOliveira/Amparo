import React from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { colors, serif } from '../theme/colors';

export default function ScreenHeader({ title, showBack = true, right }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {showBack ? (
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/home'))}
            style={styles.iconBtn}
            hitSlop={12}
          >
            <Ionicons name="chevron-back" size={28} color={colors.white} />
          </Pressable>
        ) : (
          <View style={styles.iconBtn} />
        )}
        <Text style={styles.title}>{title}</Text>
        {right ?? (
          <Pressable
            onPress={() => router.push('/perfil')}
            style={styles.profileCircle}
            hitSlop={8}
          >
            <Ionicons name="person" size={20} color={colors.dark} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.darker,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    paddingTop: 12,
    paddingBottom: 20,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    color: colors.white,
    fontSize: 22,
    fontFamily: serif,
    marginLeft: 4,
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
});
