import React, { useState } from 'react';
import { StyleSheet, Text, View, Pressable, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import ScreenBackground from '../components/ScreenBackground';
import { colors, serif } from '../theme/colors';

const SLIDES = [
  {
    title: 'Bem-Vindo a Amparo',
    body: 'Bem-vindo ao seu refúgio de serenidade. Aqui, cada palavra escrita em seu Diário Pessoal é um passo para se ouvir.\n\nCultive o hábito de se ouvir e transforme seus pensamentos em um jardim de autoconhecimento.',
  },
  {
    title: 'Cuide de você',
    body: 'Cuidar da sua mente e do seu corpo nunca foi tão simples. Com nossos aplicativos, você monitora seu progresso e mantém um jardim de emoções em dias de forma rápida.',
  },
  {
    title: 'Não se sinta sozinho',
    body: 'Não se sinta sozinho ao enfrentar seus desafios pessoais, diários, memórias e momentos. Sempre que precisar do modo Calma Urgente estamos prontos com exercícios de respiração para te acalmar imediatamente.',
  },
];

export default function Welcome() {
  const [slide, setSlide] = useState(0);
  const isLast = slide === SLIDES.length - 1;

  const next = () => {
    if (isLast) {
      router.push('/login');
    } else {
      setSlide((s) => s + 1);
    }
  };

  const current = SLIDES[slide];

  return (
    <View style={{ flex: 1 }}>
      <ScreenBackground variant="sky">
        <SafeAreaView style={styles.safe}>
          <View style={styles.content}>
            <View style={styles.sunCircle}>
              <Ionicons name="sunny" size={44} color="#f5c518" />
            </View>

            <Text style={styles.title}>{current.title}</Text>
            <Text style={styles.body}>{current.body}</Text>
          </View>

          <View style={styles.footer}>
            <View style={styles.dots}>
              {SLIDES.map((_, i) => (
                <View key={i} style={[styles.dot, i === slide && styles.dotActive]} />
              ))}
            </View>

            <Pressable style={styles.button} onPress={next}>
              <Text style={styles.buttonText}>{isLast ? 'Começar' : 'Próximo'}</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </ScreenBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 28,
    paddingVertical: 40,
  },
  content: {
    alignItems: 'center',
    marginTop: 60,
  },
  sunCircle: {
    marginBottom: 28,
  },
  title: {
    color: colors.white,
    fontFamily: serif,
    fontWeight: '700',
    fontSize: 26,
    textAlign: 'center',
    marginBottom: 20,
  },
  body: {
    color: colors.textOnDark,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  footer: {
    alignItems: 'center',
  },
  dots: {
    flexDirection: 'row',
    marginBottom: 28,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.4)',
    marginHorizontal: 4,
  },
  dotActive: {
    backgroundColor: colors.white,
  },
  button: {
    borderWidth: 1.5,
    borderColor: colors.white,
    borderRadius: 26,
    paddingVertical: 14,
    paddingHorizontal: 48,
  },
  buttonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});
