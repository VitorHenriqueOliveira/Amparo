import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function HomeScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Ionicons name="sunny" size={80} color="#FFD700" />
        <Text style={styles.title}>Tela Home Pronta! ☀️</Text>
        <Text style={styles.subtitle}>Quer me contar como você está hoje?</Text>

        <TouchableOpacity 
          style={styles.button}
          onPress={() => navigation.navigate('Diario')}
        >
          <Text style={styles.buttonText}>Abrir Diário Pessoal</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.button}
          onPress={() => navigation.navigate('Emocao')}
        >
          <Text style={styles.buttonText}>Registro Emocional</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.button}
          onPress={() => navigation.navigate('ModoCalma')}
        >
          <Text style={styles.buttonText}>Modo Calma Urgente</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#4E7810',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#FFF',
    marginTop: 15,
  },
  subtitle: {
    fontSize: 16,
    color: '#E0F0C0',
    marginBottom: 30,
    textAlign: 'center',
  },
  button: {
    width: '85%',
    backgroundColor: '#2F4B07',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});