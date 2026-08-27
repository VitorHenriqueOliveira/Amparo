import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function PerfilScreen() {
  return (
    <View style={styles.center}>
      <Text style={styles.title}>👤 Perfil do Usuário</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#4E7810' },
  title: { fontSize: 22, color: '#FFF', fontWeight: 'bold' },
});