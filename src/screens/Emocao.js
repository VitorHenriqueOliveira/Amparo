import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

const EMOTIONS = {
  feliz: {
    id: 'feliz',
    title: 'Feliz',
    iconName: 'weather-sunny',
    iconColor: '#FBBF24',
    words: 'Alegre, Contente, Eufórico, Animado, Satisfeito, Realizado, Tranquilo, Risonho, Feliz.',
  },
  triste: {
    id: 'triste',
    title: 'Triste',
    iconName: 'weather-pour',
    iconColor: '#60A5FA',
    words: 'Solidão, Desânimo, Melancolia, Frustração, Culpa, Luto, Desolado, Emotivo, Infeliz, Angustiado, Desespero.',
  },
  neutro: {
    id: 'neutro',
    title: 'Neutro',
    iconName: 'weather-night',
    iconColor: '#1D4ED8',
    words: 'Imparcial, Indefinido, Insensível, Indiferente, Distante.',
  },
  raiva: {
    id: 'raiva',
    title: 'Raiva',
    iconName: 'weather-lightning-rainy',
    iconColor: '#9CA3AF',
    words: 'Ódio, Irritação, Indignação, Rancor, Repulsa, Impaciente, Nervoso, Ansioso, Aborrecido.',
  },
};

export default function EmocaoScreen({ navigation }) {
  const [selectedEmotionKey, setSelectedEmotionKey] = useState(null);

  const selectedEmotion = selectedEmotionKey ? EMOTIONS[selectedEmotionKey] : null;

  const handleConfirm = () => {
    if (!selectedEmotion) return;
    const message = `Seu sentimento (${selectedEmotion.title}) foi gravado com sucesso!`;
    
    if (Platform.OS === 'web') {
      alert(message);
      setSelectedEmotionKey(null);
    } else {
      Alert.alert('Registro salvo', message, [
        { text: 'OK', onPress: () => setSelectedEmotionKey(null) },
      ]);
    }
  };

  return (
    <LinearGradient
      colors={['#6E9B1B', '#3E610A', '#1B2E04']}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={28} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Registro Emocional</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Perfil')}>
            <Ionicons name="person-circle-outline" size={32} color="#FFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <View style={styles.cardContainer}>
            <Text style={styles.cardQuestion}>Como se sente hoje?</Text>

            {!selectedEmotion ? (
              /* GRID DE SELEÇÃO INICIAL */
              <View style={styles.gridContainer}>
                {Object.values(EMOTIONS).map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.gridItem}
                    onPress={() => setSelectedEmotionKey(item.id)}
                    activeOpacity={0.7}
                  >
                    <MaterialCommunityIcons name={item.iconName} size={72} color={item.iconColor} />
                    <Text style={styles.gridItemText}>{item.title}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              /* DETALHES DA EMOÇÃO SELECIONADA */
              <View style={styles.detailContainer}>
                <MaterialCommunityIcons
                  name={selectedEmotion.iconName}
                  size={100}
                  color={selectedEmotion.iconColor}
                  style={styles.detailIcon}
                />
                <Text style={styles.detailTitle}>{selectedEmotion?.title}</Text>
                
                <Text style={styles.detailWords}>
                  {selectedEmotion?.words}
                </Text>

                <TouchableOpacity
                  style={styles.doneButton}
                  onPress={handleConfirm}
                  activeOpacity={0.8}
                >
                  <Text style={styles.doneButtonText}>Feito!</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* Bottom Navigation Bar */}
        <View style={styles.bottomBar}>
          <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Diario')}>
            <View style={styles.navIconCircle}>
              <Ionicons name="book-outline" size={22} color="#FFF" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Emocao')}>
            <View style={[styles.navIconCircle, styles.activeNav]}>
              <MaterialCommunityIcons name="weather-sunny" size={24} color="#1B2E04" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Sono')}>
            <View style={styles.navIconCircle}>
              <Ionicons name="moon-outline" size={22} color="#FFF" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.navItem} onPress={() => alert('Em breve')}>
            <View style={styles.navIconCircle}>
              <MaterialCommunityIcons name="weather-windy" size={24} color="#FFF" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.navItem} onPress={() => alert('Em breve')}>
            <View style={styles.navIconCircle}>
              <MaterialCommunityIcons name="sprout-outline" size={24} color="#FFF" />
            </View>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 12,
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#FFF' },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
    paddingBottom: 70,
  },
  cardContainer: {
    backgroundColor: '#1F3705',
    borderRadius: 28,
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
    minHeight: 460,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  cardQuestion: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 15,
    textAlign: 'center',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    width: '100%',
    gap: 15,
    marginTop: 10,
  },
  gridItem: {
    width: '42%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
  },
  gridItemText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 10,
  },
  detailContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    flex: 1,
  },
  detailIcon: { marginBottom: 10 },
  detailTitle: { fontSize: 22, fontWeight: 'bold', color: '#FFF', marginBottom: 12 },
  detailWords: {
    color: '#D8E8B8',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 10,
    marginBottom: 25,
  },
  doneButton: {
    backgroundColor: '#3E610A',
    paddingVertical: 10,
    paddingHorizontal: 50,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  doneButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },

  // Bottom Navigation Bar
  bottomBar: {
    position: 'absolute',
    bottom: 15,
    left: 20,
    right: 20,
    backgroundColor: '#1E3604',
    borderRadius: 30,
    height: 62,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  navItem: { alignItems: 'center', justifyContent: 'center' },
  navIconCircle: { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center' },
  activeNav: { backgroundColor: '#FFF' },
});