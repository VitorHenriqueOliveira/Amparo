import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  Pressable,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import ScreenBackground from '../components/ScreenBackground';
import { colors, serif } from '../theme/colors';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Login() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [error, setError] = useState('');

  const handleEntrar = () => {
    if (!email.trim() || !senha.trim()) {
      setError('Preencha email e senha para continuar.');
      return;
    }
    if (!EMAIL_RE.test(email.trim())) {
      setError('Digite um email válido.');
      return;
    }
    if (senha.length < 4) {
      setError('A senha precisa ter pelo menos 4 caracteres.');
      return;
    }
    setError('');
    router.push('/home');
  };

  return (
    <View style={{ flex: 1 }}>
      <ScreenBackground variant="login">
        <SafeAreaView style={styles.safe}>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View style={styles.header}>
              <Ionicons name="sunny" size={48} color="#f5c518" />
              <Text style={styles.brand}>Bem-Vindo a{'\n'}Amparo</Text>
            </View>

            <View style={styles.form}>
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor="rgba(255,255,255,0.8)"
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={(t) => {
                  setEmail(t);
                  if (error) setError('');
                }}
              />
              <TextInput
                style={styles.input}
                placeholder="Senha"
                placeholderTextColor="rgba(255,255,255,0.8)"
                secureTextEntry
                value={senha}
                onChangeText={(t) => {
                  setSenha(t);
                  if (error) setError('');
                }}
              />

              {!!error && <Text style={styles.error}>{error}</Text>}

              <Pressable>
                <Text style={styles.forgot}>Esqueceu a senha?</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
                onPress={handleEntrar}
              >
                <Text style={styles.buttonText}>Entrar</Text>
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </ScreenBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    paddingHorizontal: 28,
  },
  header: {
    alignItems: 'center',
    marginTop: 70,
    marginBottom: 60,
  },
  brand: {
    fontFamily: serif,
    fontStyle: 'italic',
    fontWeight: '700',
    fontSize: 26,
    color: '#1b2b12',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 32,
  },
  form: {
    gap: 16,
  },
  input: {
    backgroundColor: colors.midSolid,
    borderRadius: 26,
    paddingHorizontal: 22,
    paddingVertical: 16,
    color: colors.white,
    fontSize: 15,
  },
  error: {
    color: '#7a1f1f',
    fontSize: 13,
    marginLeft: 6,
    marginTop: -6,
    fontWeight: '600',
  },
  forgot: {
    color: '#2c3a1f',
    fontSize: 13,
    marginLeft: 6,
    marginTop: -4,
  },
  button: {
    backgroundColor: colors.darker,
    borderRadius: 26,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 16,
  },
});
