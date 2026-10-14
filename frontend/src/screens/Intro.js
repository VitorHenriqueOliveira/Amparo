import React, { useState } from 'react';

import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const SLIDES = [
  {
    title: 'Bem-Vindo a Amparo',
    text: 'Bem-vindo ao seu refúgio de serenidade. Aqui, cada palavra escrita em seu Diário Pessoal é um passo para se ouvir.\n\nCultive o hábito de se ouvir e transforme seus pensamentos em um jardim de autoconhecimento.',
    icon: 'sunny',
  },
  {
    title: 'Cuidado Diário',
    text: 'Cuidar da sua mente e do seu corpo nunca foi tão simples. Com o nosso aplicativo, você monitora suas emoções e suas metas de sono todos os dias de forma rápida.',
    icon: 'heart',
  },
  {
    title: 'Acompanhamento',
    text: 'Nós te ajudamos a entender sua evolução pessoal com filtros diários, semanais e mensais, mostrando claramente o impacto do seu descanso no seu humor.\n\nNosso Modo Calma Urgente estará pronto com exercícios de respiração para te acalmar instantaneamente.',
    icon: 'trending-up',
  },
];

export default function IntroScreen({ navigation }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      navigation.replace('MainTabs');
    }
  };

  const currentSlide = SLIDES[currentIndex];

  return (
    <LinearGradient
      colors={['#4DA0E0', '#76C043', '#4E7810']}
      locations={[0, 0.48, 1]}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>

        {/* =========================
            BRILHOS DECORATIVOS
        ========================= */}

        <View style={styles.sunGlow} />
        <View style={styles.glowBottom} />


        {/* =========================
            NOME DO APP
        ========================= */}

        <View style={styles.brandContainer}>
          <Ionicons
            name="leaf-outline"
            size={18}
            color="#FFF"
          />

          <Text style={styles.brandText}>
            AMPARO
          </Text>
        </View>


        {/* =========================
            CONTEÚDO
        ========================= */}

        <View style={styles.content}>

          {/* SOL */}
          <View style={styles.sunContainer}>

            <Ionicons
              name="sunny"
              size={112}
              color="#FFD700"
              style={styles.sun}
            />

            <Text style={styles.smallGreeting}>
              UM ESPAÇO PARA VOCÊ
            </Text>

          </View>


          {/* ÍCONE DO SLIDE */}
          <View style={styles.slideIconContainer}>
            <Ionicons
              name={currentSlide.icon}
              size={30}
              color="#FFD700"
            />
          </View>


          {/* TÍTULO */}
          <Text style={styles.titleText}>
            {currentSlide.title}
          </Text>


          {/* TEXTO */}
          <Text style={styles.bodyText}>
            {currentSlide.text}
          </Text>


          {/* =========================
              PROGRESSO
          ========================= */}

          <View style={styles.progressContainer}>

            <Text style={styles.progressText}>
              {currentIndex + 1} de {SLIDES.length}
            </Text>

            <View style={styles.dotsContainer}>
              {SLIDES.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.dot,
                    currentIndex === index
                      ? styles.activeDot
                      : styles.inactiveDot,
                  ]}
                />
              ))}
            </View>

          </View>


          {/* =========================
              BOTÃO
          ========================= */}

          <TouchableOpacity
            style={styles.nextButton}
            onPress={handleNext}
            activeOpacity={0.82}
          >
            <Text style={styles.nextButtonText}>
              {currentIndex === SLIDES.length - 1
                ? 'Começar'
                : 'Próximo'}
            </Text>

            <Ionicons
              name="arrow-forward"
              size={21}
              color="#4E7810"
            />
          </TouchableOpacity>

        </View>

      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({

  /* =========================
     FUNDO
  ========================= */

  container: {
    flex: 1,
  },

  safeArea: {
    flex: 1,
  },


  /* =========================
     BRILHO DO SOL
  ========================= */

  sunGlow: {
    position: 'absolute',

    width: 300,
    height: 300,

    borderRadius: 150,

    backgroundColor: 'rgba(255,215,0,0.10)',

    top: -150,
    right: -80,
  },

  glowBottom: {
    position: 'absolute',

    width: 220,
    height: 220,

    borderRadius: 110,

    backgroundColor: 'rgba(255,255,255,0.08)',

    bottom: -120,
    left: -90,
  },


  /* =========================
     MARCA
  ========================= */

  brandContainer: {
    flexDirection: 'row',

    alignItems: 'center',
    justifyContent: 'center',

    gap: 7,

    marginTop: 18,
  },

  brandText: {
    color: '#FFF',

    fontSize: 18,

    fontWeight: '900',

    letterSpacing: 3,
  },


  /* =========================
     CONTEÚDO
  ========================= */

  content: {
    flex: 1,

    alignItems: 'center',

    justifyContent: 'space-between',

    paddingHorizontal: 28,

    paddingTop: 18,

    paddingBottom: 20,
  },


  /* =========================
     SOL
  ========================= */

  sunContainer: {
    alignItems: 'center',

    marginTop: 2,
  },

  sun: {
    marginBottom: 5,

    textShadowColor: 'rgba(255,215,0,0.95)',

    textShadowOffset: {
      width: 0,
      height: 0,
    },

    textShadowRadius: 20,
  },

  smallGreeting: {
    color: '#FFF',

    fontSize: 11,

    fontWeight: '900',

    letterSpacing: 2,

    opacity: 0.9,
  },


  /* =========================
     ÍCONE DO SLIDE
  ========================= */

  slideIconContainer: {
    marginTop: 2,

    alignItems: 'center',
    justifyContent: 'center',
  },


  /* =========================
     TÍTULO
  ========================= */

  titleText: {
    color: '#FFD700',

    fontSize: 29,

    fontWeight: '900',

    textAlign: 'center',

    letterSpacing: 0.2,

    textShadowColor: 'rgba(0,0,0,0.15)',

    textShadowOffset: {
      width: 0,
      height: 2,
    },

    textShadowRadius: 4,
  },


  /* =========================
     TEXTO
  ========================= */

  bodyText: {
    color: '#FFFFFF',

    fontSize: 16,

    lineHeight: 25,

    fontWeight: '500',

    textAlign: 'center',

    paddingHorizontal: 4,

    textShadowColor: 'rgba(0,0,0,0.16)',

    textShadowOffset: {
      width: 0,
      height: 1,
    },

    textShadowRadius: 3,
  },


  /* =========================
     PROGRESSO
  ========================= */

  progressContainer: {
    alignItems: 'center',

    marginTop: 4,
  },

  progressText: {
    color: '#FFF',

    fontSize: 12,

    fontWeight: '800',

    marginBottom: 8,

    opacity: 0.88,

    letterSpacing: 0.5,
  },

  dotsContainer: {
    flexDirection: 'row',

    alignItems: 'center',
  },

  dot: {
    height: 8,

    borderRadius: 4,

    marginHorizontal: 4,
  },

  activeDot: {
    width: 28,

    backgroundColor: '#FFD700',
  },

  inactiveDot: {
    width: 8,

    backgroundColor: 'rgba(255,255,255,0.42)',
  },


  /* =========================
     BOTÃO
  ========================= */

  nextButton: {
    width: '74%',

    minHeight: 56,

    borderRadius: 30,

    flexDirection: 'row',

    alignItems: 'center',
    justifyContent: 'center',

    gap: 9,

    backgroundColor: '#FFD700',

    shadowColor: '#FFD700',

    shadowOffset: {
      width: 0,
      height: 4,
    },

    shadowOpacity: 0.45,

    shadowRadius: 9,

    elevation: 7,
  },

  nextButtonText: {
    color: '#4E7810',

    fontSize: 17,

    fontWeight: '900',

    letterSpacing: 0.4,
  },

});