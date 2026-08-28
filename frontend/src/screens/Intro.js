import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  SafeAreaView 
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const SLIDES = [
  {
    title: "Bem-Vindo a Amparo",
    text: "Bem-vindo ao seu refúgio de serenidade. Aqui, cada palavra escrita em seu Diário Pessoal é um passo para se ouvir.\n\nCultive o hábito de se ouvir e transforme seus pensamentos em um jardim de autoconhecimento."
  },
  {
    title: "Cuidado Diário",
    text: "Cuidar da sua mente e do seu corpo nunca foi tão simples. Com o nosso aplicativo, você monitora suas emoções e suas metas de sono todos os dias de forma rápida."
  },
  {
    title: "Acompanhamento",
    text: "Nós te ajudamos a entender sua evolução pessoal com filtros diários, semanais e mensais, mostrando claramente o impacto do seu descanso no seu humor.\n\nNosso Modo Calma Urgente estará pronto com exercícios de respiração para te acalmar instantaneamente."
  }
];

export default function IntroScreen({ navigation }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      navigation.navigate('MainTabs');
    }
  };

  return (
    <LinearGradient
      colors={['#4DA0E0', '#76C043', '#4E7810']}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          {/* Sol no topo */}
          <View style={styles.logoContainer}>
            <Ionicons name="sunny" size={110} color="#FFD700" />
          </View>

          {/* Conteúdo do Slide */}
          <View style={styles.textContainer}>
            <Text style={styles.titleText}>{SLIDES[currentIndex].title}</Text>
            <Text style={styles.bodyText}>{SLIDES[currentIndex].text}</Text>
          </View>

          {/* Indicadores (Dots) */}
          <View style={styles.dotsContainer}>
            {SLIDES.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  currentIndex === index ? styles.activeDot : styles.inactiveDot
                ]}
              />
            ))}
          </View>

          {/* Botão de Avançar */}
          <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
            <Text style={styles.nextButtonText}>
              {currentIndex === SLIDES.length - 1 ? "Começar" : "Próximo"}
            </Text>
          </TouchableOpacity>
        </View>
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
  content: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 25,
    paddingVertical: 30,
  },
  logoContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  textContainer: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 15,
  },
  titleText: {
    fontSize: 28,
    fontStyle: 'italic',
    color: '#FFF',
    marginBottom: 20,
    textAlign: 'center',
    fontWeight: '600',
  },
  bodyText: {
    fontSize: 16,
    color: '#FFF',
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: '400',
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 15,
  },
  dot: {
    height: 10,
    borderRadius: 5,
    marginHorizontal: 4,
  },
  activeDot: {
    width: 22,
    backgroundColor: '#FFF',
  },
  inactiveDot: {
    width: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  nextButton: {
    width: '50%',
    height: 45,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFF',
    marginBottom: 10,
  },
  nextButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});