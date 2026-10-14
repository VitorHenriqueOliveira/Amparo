import React, { useEffect, useRef, useState } from 'react';

import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';

const PHASES = [
  {
    name: 'Inspire',
    duration: 4,
    instruction: 'Inspire suavemente, sem forçar.',
    scale: 1,
  },
  {
    name: 'Segure',
    duration: 2,
    instruction: 'Se for confortável, mantenha o ar.',
    scale: 1,
  },
  {
    name: 'Expire',
    duration: 6,
    instruction: 'Solte o ar devagar, no seu ritmo.',
    scale: 0.86,
  },
  {
    name: 'Descanse',
    duration: 2,
    instruction: 'Relaxe antes do próximo ciclo.',
    scale: 0.86,
  },
];

// Mesma ordem e mesmos ícones das outras telas.
const BOTTOM_NAV_ICONS = [
  { name: 'book-outline', route: 'Diario' },
  { name: 'happy-outline', route: 'Emocao' },
  { name: 'moon-outline', route: 'Sono' },
  { name: 'trending-up-outline', route: 'Grafico' },
  { name: 'heart-outline', route: 'ModoCalma' },
];

export default function ModoCalmaScreen({ navigation }) {
  const isFocused = useIsFocused();
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [seconds, setSeconds] = useState(PHASES[0].duration);
  const [paused, setPaused] = useState(false);

  const breathingScale = useRef(
    new Animated.Value(0.86)
  ).current;

  const currentPhase = PHASES[phaseIndex];

  // Contador: cada fase respeita sua própria duração.
useEffect(() => {
  if (paused || !isFocused) return;

  const interval = setInterval(() => {
    setSeconds((currentSeconds) => {
      if (currentSeconds > 1) {
        return currentSeconds - 1;
      }

      setPhaseIndex((currentIndex) => {
        const nextIndex = (currentIndex + 1) % PHASES.length;
        return nextIndex;
      });

      return PHASES[(phaseIndex + 1) % PHASES.length].duration;
    });
  }, 1000);

  return () => clearInterval(interval);
}, [paused, phaseIndex, isFocused]);

  // Animação sincronizada com a fase atual.
  useEffect(() => {
    breathingScale.stopAnimation();

    if (paused || !isFocused) return;

    const targetScale = currentPhase.scale;
    const duration = currentPhase.duration * 1000;

    const animation = Animated.timing(breathingScale, {
      toValue: targetScale,
      duration,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [phaseIndex, paused, isFocused, breathingScale, currentPhase]);

  const togglePause = () => {
    setPaused((currentValue) => !currentValue);
  };

  return (
    <LinearGradient
      colors={['#BBFF00', '#F0FCCE', '#72A600']}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <LinearGradient
          colors={['#2A4705', '#162802']}
          style={styles.headerBar}
        >
          <TouchableOpacity
            style={styles.headerSide}
            onPress={() => navigation?.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons
              name="chevron-back"
              size={27}
              color="#BBFF00"
            />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>
            Modo calma urgente
          </Text>

          <TouchableOpacity
            style={styles.headerSide}
            onPress={() => navigation?.navigate('Perfil')}
            activeOpacity={0.7}
          >
            <Ionicons
              name="person-circle-outline"
              size={31}
              color="#BBFF00"
            />
          </TouchableOpacity>
        </LinearGradient>

        <View style={styles.content}>
          <LinearGradient
            colors={['#3A6B0A', '#234104', '#142702']}
            style={styles.mainCard}
          >
            <View style={styles.breathingIcon}>
              <Ionicons
                name="leaf-outline"
                size={36}
                color="#BBFF00"
              />
            </View>

            <Text style={styles.cardTitle}>
              Modo Calma Urgente
            </Text>

            <Text style={styles.cardSubtitle}>
              Um momento para desacelerar
            </Text>

            <View style={styles.breathingArea}>
              <View style={styles.outerCircle} />
              <View style={styles.middleCircle} />

              <Animated.View
                style={[
                  styles.breathingCircle,
                  {
                    transform: [{ scale: breathingScale }],
                  },
                ]}
              >
                <Text style={styles.phaseText}>
                  {currentPhase.name}
                </Text>

                <Text style={styles.numberText}>
                  {seconds}
                </Text>

                <Text style={styles.secondsText}>
                  {seconds === 1 ? 'segundo' : 'segundos'}
                </Text>
              </Animated.View>
            </View>

            <Text style={styles.instruction}>
              {currentPhase.instruction}
            </Text>

            <TouchableOpacity
              style={styles.pauseButton}
              onPress={togglePause}
              activeOpacity={0.8}
            >
              <View style={styles.pauseIconCircle}>
                <Ionicons
                  name={paused ? 'play' : 'pause'}
                  size={17}
                  color="#FFF"
                />
              </View>

              <Text style={styles.pauseText}>
                {paused ? 'Continuar' : 'Pausar'}
              </Text>
            </TouchableOpacity>

            <Text style={styles.bottomHint}>
              Não precisa respirar fundo nem seguir perfeitamente o
              ritmo. Respeite o que for confortável para você.
            </Text>
          </LinearGradient>
        </View>

        {/* Barra de navegação padronizada */}
        <LinearGradient
          colors={['#2A4705', '#162802']}
          style={styles.floatingBottomNav}
        >
          {BOTTOM_NAV_ICONS.map((item) => {
            const ativo = item.route === 'ModoCalma';

            return (
              <TouchableOpacity
                key={item.route}
                style={styles.navItem}
                activeOpacity={0.8}
                onPress={() => navigation?.navigate(item.route)}
                accessibilityRole="button"
                accessibilityState={{ selected: ativo }}
                accessibilityLabel={
                  item.route === 'Diario'
                    ? 'Diário'
                    : item.route === 'Emocao'
                      ? 'Registro emocional'
                      : item.route === 'Sono'
                        ? 'Sono'
                        : item.route === 'Grafico'
                          ? 'Evolução emocional'
                          : 'Modo Calma Urgente'
                }
              >
                <View
                  style={[
                    styles.navCircle,
                    ativo && styles.navCircleActive,
                  ]}
                >
                  <Ionicons
                    name={item.name}
                    size={20}
                    color={ativo ? '#162704' : '#E0F0C0'}
                  />
                </View>
              </TouchableOpacity>
            );
          })}
        </LinearGradient>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  safeArea: {
    flex: 1,
  },

  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 12,
    height: 60,
    paddingHorizontal: 12,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },

  headerSide: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerTitle: {
    flex: 1,
    color: '#FFF',
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0.2,
  },

  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    justifyContent: 'center',
  },

  mainCard: {
    width: '100%',
    borderRadius: 30,
    paddingHorizontal: 18,
    paddingVertical: 22,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(187,255,0,0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },

  breathingIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 5,
  },

  cardTitle: {
    color: '#BBFF00',
    fontSize: 23,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 0.3,
    marginBottom: 3,
  },

  cardSubtitle: {
    color: '#E0F0C0',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 8,
  },

  breathingArea: {
    width: 245,
    height: 245,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 2,
  },

  outerCircle: {
    position: 'absolute',
    width: 232,
    height: 232,
    borderRadius: 116,
    borderWidth: 3,
    borderColor: '#BBFF00',
  },

  middleCircle: {
    position: 'absolute',
    width: 214,
    height: 214,
    borderRadius: 107,
    borderWidth: 1,
    borderColor: 'rgba(187,255,0,0.28)',
  },

  breathingCircle: {
    width: 188,
    height: 188,
    borderRadius: 94,
    backgroundColor: '#2B7607',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#4B980F',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },

  phaseText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },

  numberText: {
    color: '#FFF',
    fontSize: 58,
    lineHeight: 62,
    fontWeight: '300',
    marginVertical: -2,
  },

  secondsText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },

  instruction: {
    color: '#E0F0C0',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 5,
    paddingHorizontal: 8,
    lineHeight: 20,
  },

  pauseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#BBFF00',
    borderRadius: 28,
    minHeight: 48,
    paddingHorizontal: 10,
    paddingRight: 20,
    marginTop: 12,
    shadowColor: '#BBFF00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 7,
    elevation: 5,
  },

  pauseIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#274804',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },

  pauseText: {
    color: '#274804',
    fontSize: 16,
    fontWeight: '900',
  },

  bottomHint: {
    color: 'rgba(224,240,192,0.75)',
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '500',
    marginTop: 10,
    textAlign: 'center',
  },

  floatingBottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    height: 62,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 30,
    paddingHorizontal: 4,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },

  navItem: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },

  navCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },

  navCircleActive: {
    backgroundColor: '#C8FF00',
  },
});