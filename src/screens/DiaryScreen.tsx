// src/screens/DiaryScreen.tsx
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeOutUp, FadeIn } from 'react-native-reanimated';

import MoodOption from '../components/MoodOption';
import DiaryInput from '../components/DiaryInput';
import SaveButton from '../components/SaveButton';

import { colors, moodOptions } from '../constants/diary';
import { EmotionalDiaryEntry, MoodKey } from '../types/diary';

interface DiaryScreenProps {
  /** Callback opcional para o botão de voltar, injetado pela navegação do app. */
  onGoBack?: () => void;
  /** Callback opcional para o ícone de perfil, injetado pela navegação do app. */
  onOpenProfile?: () => void;
}

export default function DiaryScreen({ onGoBack, onOpenProfile }: DiaryScreenProps) {
  const [selectedMood, setSelectedMood] = useState<MoodKey | null>(null);
  const [note, setNote] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  const successTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedMoodData = moodOptions.find((m) => m.key === selectedMood);

  // Limpa o timer do card de sucesso se a tela for desmontada no meio da animação.
  useEffect(() => {
    return () => {
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current);
      }
    };
  }, []);

  /**
   * Monta o registro e prepara o ponto de integração futura com o Firebase.
   * Por enquanto, apenas simula o salvamento e exibe uma confirmação animada.
   */
  function handleSaveEntry() {
    if (!selectedMood) {
      Alert.alert(
        'Quase lá 🌿',
        'Escolha como você está se sentindo antes de salvar o registro.'
      );
      return;
    }

    const entry: EmotionalDiaryEntry = {
      mood: selectedMood,
      note: note.trim(),
      createdAt: new Date(),
    };

    // TODO (futuro): substituir o bloco abaixo pela chamada real ao Firebase, ex:
    // await addDoc(collection(db, 'diaryEntries'), entry);
    console.log('Registro do Diário Emocional pronto para salvar:', entry);

    setShowSuccess(true);
    setSelectedMood(null);
    setNote('');

    successTimeoutRef.current = setTimeout(() => {
      setShowSuccess(false);
    }, 2000);
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Cabeçalho */}
        <View style={styles.header}>
          <Pressable
            onPress={onGoBack}
            accessibilityRole="button"
            accessibilityLabel="Voltar"
            hitSlop={12}
            style={styles.backButton}
          >
            <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
          </Pressable>
          <Text style={styles.headerTitle}>Diário Emocional</Text>
          <Pressable
            onPress={onOpenProfile}
            accessibilityRole="button"
            accessibilityLabel="Abrir perfil"
            hitSlop={12}
            style={styles.profileButton}
          >
            <Ionicons name="person-circle-outline" size={26} color={colors.textPrimary} />
          </Pressable>
        </View>

        {/* Card de sucesso animado, aparece ao salvar e some sozinho */}
        {showSuccess ? (
          <Animated.View
            entering={FadeInDown.duration(280)}
            exiting={FadeOutUp.duration(220)}
            style={styles.successBanner}
          >
            <Ionicons name="checkmark-circle" size={20} color={colors.white} />
            <Text style={styles.successText}>Registro salvo com sucesso</Text>
          </Animated.View>
        ) : null}

        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.subtitle}>
            Um espaço para você registrar como está se sentindo.
          </Text>

          {/* Seleção de humor */}
          <Text style={styles.sectionTitle}>Como você está se sentindo hoje?</Text>
          <View style={styles.moodRow}>
            {moodOptions.map((option) => (
              <MoodOption
                key={option.key}
                emoji={option.emoji}
                label={option.label}
                selected={selectedMood === option.key}
                onPress={() => setSelectedMood(option.key)}
              />
            ))}
          </View>

          {/* Descrição da emoção selecionada, para ajudar o usuário a se reconhecer */}
          {selectedMoodData ? (
            <Animated.View
              entering={FadeInDown.duration(220)}
              style={styles.descriptionCard}
            >
              <Text style={styles.descriptionEmoji}>{selectedMoodData.emoji}</Text>
              <View style={styles.descriptionTextWrapper}>
                <Text style={styles.descriptionLabel}>{selectedMoodData.label}</Text>
                <Text style={styles.descriptionText}>{selectedMoodData.description}</Text>
              </View>
            </Animated.View>
          ) : null}

          {/* Campo de texto */}
          <Text style={styles.sectionTitle}>Quer contar um pouco mais?</Text>
          <DiaryInput value={note} onChangeText={setNote} />

          {/* Botão de salvar */}
          <View style={styles.saveButtonWrapper}>
            <SaveButton
              label="Salvar registro"
              disabled={!selectedMood}
              onPress={handleSaveEntry}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.background,
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.2,
    color: colors.textPrimary,
  },
  profileButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryGreen,
    marginHorizontal: 20,
    marginBottom: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 14,
    gap: 8,
  },
  successText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 10,
    marginTop: 8,
  },
  moodRow: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  descriptionCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.veryLightGreen,
    borderRadius: 16,
    padding: 14,
    marginBottom: 24,
  },
  descriptionEmoji: {
    fontSize: 24,
    marginRight: 10,
  },
  descriptionTextWrapper: {
    flex: 1,
  },
  descriptionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  descriptionText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  saveButtonWrapper: {
    marginTop: 8,
  },
});
