import React, { useEffect, useRef, useState, useContext } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  ScrollView,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { adicionarEmocao } from '../storage/registros';
import { AuthContext } from '../contexts/AuthContext';

const BOTTOM_NAV_ITEMS = [
  { icon: 'book-outline', route: 'Diario', label: 'Diário Emocional' },
  { icon: 'happy-outline', route: 'Emocao', label: 'Registro Emocional' },
  { icon: 'moon-outline', route: 'Sono', label: 'Registro de Sono' },
  { icon: 'trending-up-outline', route: 'Grafico', label: 'Evolução Emocional' },
  { icon: 'heart-outline', route: 'ModoCalma', label: 'Modo Calma Urgente' },
];

const EMOTIONS = {
  feliz: {
    id: 'feliz',
    title: 'Feliz',
    icon: 'sunny',
    color: '#f5c000',
    words:
      'Alegre, Contente, Eufórico, Animado, Satisfeito, Realizado, Tranquilo, Risonho, Feliz.',
  },
  triste: {
    id: 'triste',
    title: 'Triste',
    icon: 'cloud-outline',
    color: '#0068e6',
    words:
      'Solidão, Desânimo, Melancolia, Frustração, Culpa, Luto, Desolado, Emotivo, Infeliz, Angustiado, Desespero.',
  },
  neutro: {
    id: 'neutro',
    title: 'Neutro',
    icon: 'moon',
    color: '#005197',
    words:
      'Imparcial, Indefinido, Insensível, Indiferente, Distante.',
  },
  raiva: {
    id: 'raiva',
    title: 'Raiva',
    icon: 'thunderstorm',
    color: '#b31f1c',
    words:
      'Ódio, Irritação, Indignação, Rancor, Repulsa, Impaciente, Nervoso, Ansioso, Aborrecido.',
  },
};

export default function EmocaoScreen({ navigation }) {
  const { usuario } = useContext(AuthContext);
  const [selectedEmotionKey, setSelectedEmotionKey] = useState(null);
  const [saving, setSaving] = useState(false);

  const iconPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(iconPulse, {
          toValue: 1.06,
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(iconPulse, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();

    return () => animation.stop();
  }, [iconPulse]);

  const selectedEmotion = selectedEmotionKey
    ? EMOTIONS[selectedEmotionKey]
    : null;

  const handleConfirm = async () => {
    if (!selectedEmotion || saving) return;

    setSaving(true);

    try {
      await adicionarEmocao(
        usuario.id_usuario,
        selectedEmotion.id,
        selectedEmotion.title
      );

      const message =
        `Seu sentimento (${selectedEmotion.title}) foi gravado com sucesso!`;

      if (Platform.OS === 'web') {
        alert(message);
        setSelectedEmotionKey(null);
      } else {
        Alert.alert('Registro salvo', message, [
          {
            text: 'OK',
            onPress: () => setSelectedEmotionKey(null),
          },
        ]);
      }
    } catch (error) {
      console.error('Erro ao salvar emoção:', error);

      const errorMessage =
        'Não foi possível salvar a emoção. Tente novamente.';

      if (Platform.OS === 'web') {
        alert(errorMessage);
      } else {
        Alert.alert('Erro', errorMessage);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleNavigation = (route) => {
    navigation.navigate(route);
  };

  return (
    <LinearGradient
      colors={['#BBFF00', '#F0FCCE', '#72A600']}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <LinearGradient
          colors={['#2A4705', '#162802']}
          style={styles.headerBox}
        >
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel="Voltar"
          >
            <Ionicons
              name="chevron-back"
              size={24}
              color="#BDE868"
            />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>
            Registro Emocional
          </Text>

          <TouchableOpacity
            onPress={() => handleNavigation('Perfil')}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel="Abrir perfil"
          >
            <Ionicons
              name="person-circle-outline"
              size={26}
              color="#BDE868"
            />
          </TouchableOpacity>
        </LinearGradient>

        <View style={styles.contentArea}>
          <LinearGradient
            colors={['#498610', '#223F00', '#101B04']}
            style={styles.mainCardContainer}
          >
            <ScrollView
              style={styles.cardScroll}
              contentContainerStyle={styles.cardScrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.cardQuestion}>
                Como se sente hoje?
              </Text>

              {!selectedEmotion ? (
                <View style={styles.gridContainer}>
                  {Object.values(EMOTIONS).map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.gridItem}
                      onPress={() => setSelectedEmotionKey(item.id)}
                      activeOpacity={0.75}
                      accessibilityRole="button"
                      accessibilityLabel={`Selecionar emoção ${item.title}`}
                    >
                      <Animated.View
                        style={[
                          styles.emotionIconMotion,
                          {
                            transform: [{ scale: iconPulse }],
                          },
                        ]}
                      >
                        <Ionicons
                          name={item.icon}
                          size={72}
                          color={item.color}
                        />
                      </Animated.View>

                      <Text style={styles.gridItemText}>
                        {item.title}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <View style={styles.detailContainer}>
                  <Animated.View
                    style={{
                      transform: [{ scale: iconPulse }],
                      marginBottom: 16,
                    }}
                  >
                    <Ionicons
                      name={selectedEmotion.icon}
                      size={100}
                      color={selectedEmotion.color}
                    />
                  </Animated.View>

                  <Text style={styles.detailTitle}>
                    {selectedEmotion.title}
                  </Text>

                  <Text style={styles.detailWords}>
                    {selectedEmotion.words}
                  </Text>

                  <TouchableOpacity
                    style={[
                      styles.doneButton,
                      saving && styles.doneButtonDisabled,
                    ]}
                    onPress={handleConfirm}
                    disabled={saving}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel="Salvar sentimento"
                  >
                    <Text style={styles.doneButtonText}>
                      {saving ? 'Salvando...' : 'Feito!'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => setSelectedEmotionKey(null)}
                    disabled={saving}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel="Mudar sentimento"
                  >
                    <Text style={styles.backButtonText}>
                      Mudar sentimento
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </LinearGradient>
        </View>

        <LinearGradient
          colors={['#2A4705', '#162802']}
          style={styles.bottomNavbar}
        >
          {BOTTOM_NAV_ITEMS.map((item) => {
            const isActive = item.route === 'Emocao';

            return (
              <TouchableOpacity
                key={item.route}
                style={styles.navItem}
                onPress={() => handleNavigation(item.route)}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={item.label}
              >
                {isActive ? (
                  <View style={styles.activeCircleIcon}>
                    <Ionicons
                      name={item.icon}
                      size={24}
                      color="#162704"
                    />
                  </View>
                ) : (
                  <Ionicons
                    name={item.icon}
                    size={24}
                    color="rgba(255,255,255,0.8)"
                  />
                )}
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

  headerBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 12,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 30,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },

  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
    letterSpacing: 0.5,
  },

  contentArea: {
    flex: 1,
  },

  mainCardContainer: {
    flex: 1,
    borderRadius: 28,
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },

  cardScroll: {
    flex: 1,
  },

  cardScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 8,
  },

  cardQuestion: {
    fontSize: 24,
    fontWeight: '900',
    color: '#D6FF55',
    marginBottom: 24,
    textAlign: 'center',
    letterSpacing: 0.5,
  },

  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
  },

  gridItem: {
    width: '48%',
    minHeight: 140,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 6,
    marginBottom: 12,
    backgroundColor: 'rgba(255,255,255,0.045)',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },

  emotionIconMotion: {
    minHeight: 82,
    justifyContent: 'center',
    alignItems: 'center',
  },

  gridItemText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 10,
    textAlign: 'center',
  },

  detailContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingHorizontal: 6,
    paddingVertical: 12,
  },

  detailTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#D6FF55',
    marginBottom: 12,
    letterSpacing: 1,
    textAlign: 'center',
  },

  detailWords: {
    color: '#F0FCCE',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 10,
    marginBottom: 26,
    fontWeight: '500',
  },

  doneButton: {
    backgroundColor: '#C8FF00',
    paddingVertical: 14,
    paddingHorizontal: 60,
    borderRadius: 30,
    shadowColor: '#C8FF00',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    marginBottom: 12,
  },

  doneButtonDisabled: {
    opacity: 0.6,
  },

  doneButtonText: {
    color: '#274804',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  backButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },

  backButtonText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },

  bottomNavbar: {
    borderRadius: 30,
    height: 62,
    marginHorizontal: 16,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },

  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    height: '100%',
  },

  activeCircleIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#C8FF00',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#C8FF00',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 4,
  },
});