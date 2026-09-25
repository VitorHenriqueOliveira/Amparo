import React, { useState } from 'react';
import { StyleSheet, Text, View, Pressable, SafeAreaView, Modal } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import ScreenBackground from '../components/ScreenBackground';
import ScreenHeader from '../components/ScreenHeader';
import BottomNav from '../components/BottomNav';
import { colors, serif, shadow } from '../theme/colors';
import { useAppData } from '../context/AppDataContext';

const MOODS = [
  {
    key: 'Feliz',
    icon: (size) => <Ionicons name="sunny" size={size} color={colors.moodHappy} />,
    tags: ['Alegre', 'Contente', 'Radiante', 'Animado', 'Satisfeito', 'Realizado', 'Tranquilo', 'Grato'],
  },
  {
    key: 'Triste',
    icon: (size) => <MaterialCommunityIcons name="weather-pouring" size={size} color={colors.moodSad} />,
    tags: ['Desanimado', 'Melancólico', 'Frustrado', 'Culpado', 'Solitário', 'Desolado', 'Exausto', 'Angustiado'],
  },
  {
    key: 'Neutro',
    icon: (size) => <Ionicons name="moon" size={size} color={colors.moodNeutral} />,
    tags: ['Inseguro', 'Indiferente', 'Indeciso', 'Distraído', 'Sereno'],
  },
  {
    key: 'Raiva',
    icon: (size) => (
      <MaterialCommunityIcons name="weather-lightning-rainy" size={size} color={colors.moodAngry} />
    ),
    tags: ['Irritado', 'Indignado', 'Rancoroso', 'Impaciente', 'Nervoso', 'Ansioso', 'Aborrecido'],
  },
];

export default function RegistroEmocional() {
  const { registerMood, todaysMood } = useAppData();
  const [openMood, setOpenMood] = useState(null);
  const [selectedTags, setSelectedTags] = useState([]);
  const [justSaved, setJustSaved] = useState(false);

  const openModal = (mood) => {
    setOpenMood(mood);
    setSelectedTags([]);
    setJustSaved(false);
  };

  const toggleTag = (tag) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleClose = () => {
    if (openMood) {
      registerMood(openMood.key, selectedTags);
      setJustSaved(true);
      setTimeout(() => setOpenMood(null), 500);
    } else {
      setOpenMood(null);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <ScreenBackground variant="light">
        <SafeAreaView style={{ flex: 1 }}>
          <ScreenHeader title="Registro Emocional" />

          <View style={styles.body}>
            <View style={[styles.card, shadow]}>
              <Text style={styles.question}>Como se sente hoje?</Text>

              <View style={styles.grid}>
                {MOODS.map((mood) => {
                  const isToday = todaysMood?.mood === mood.key;
                  return (
                    <Pressable
                      key={mood.key}
                      style={({ pressed }) => [
                        styles.moodBtn,
                        isToday && styles.moodBtnActive,
                        pressed && styles.moodBtnPressed,
                      ]}
                      onPress={() => openModal(mood)}
                    >
                      {isToday && (
                        <View style={styles.checkBadge}>
                          <Ionicons name="checkmark" size={12} color={colors.dark} />
                        </View>
                      )}
                      {mood.icon(40)}
                      <Text style={styles.moodLabel}>{mood.key}</Text>
                    </Pressable>
                  );
                })}
              </View>

              {todaysMood && (
                <Text style={styles.alreadyText}>
                  Hoje você já registrou: {todaysMood.mood}. Pode trocar tocando em outra opção.
                </Text>
              )}
            </View>

            <Pressable style={styles.graphLink} onPress={() => router.push('/grafico')}>
              <MaterialCommunityIcons name="chart-donut" size={16} color={colors.dark} />
              <Text style={styles.graphLinkText}>Ver evolução emocional</Text>
            </Pressable>
          </View>

          <BottomNav active="registro" />

          <Modal visible={!!openMood} transparent animationType="fade" onRequestClose={() => setOpenMood(null)}>
            <View style={styles.modalOverlay}>
              {openMood && (
                <View style={styles.modalCard}>
                  <Text style={styles.modalQuestion}>Como se sente hoje?</Text>
                  {openMood.icon(56)}
                  <Text style={styles.modalMoodName}>{openMood.key}</Text>
                  <Text style={styles.modalHint}>Toque nas palavras que combinam com você:</Text>

                  <View style={styles.tagsWrap}>
                    {openMood.tags.map((tag) => {
                      const selected = selectedTags.includes(tag);
                      return (
                        <Pressable
                          key={tag}
                          style={[styles.tag, selected && styles.tagSelected]}
                          onPress={() => toggleTag(tag)}
                        >
                          <Text style={[styles.tagText, selected && styles.tagTextSelected]}>
                            {tag}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  <Pressable style={styles.closeBtn} onPress={handleClose}>
                    <Text style={styles.closeBtnText}>{justSaved ? 'Salvo ✓' : 'Fechar'}</Text>
                  </Pressable>
                </View>
              )}
            </View>
          </Modal>
        </SafeAreaView>
      </ScreenBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    paddingHorizontal: 16,
    justifyContent: 'center',
    gap: 16,
  },
  card: {
    backgroundColor: colors.darker,
    borderRadius: 28,
    paddingVertical: 36,
    paddingHorizontal: 24,
  },
  question: {
    color: colors.white,
    fontFamily: serif,
    fontWeight: '700',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 30,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 28,
  },
  moodBtn: {
    width: '48%',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 18,
  },
  moodBtnActive: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  moodBtnPressed: {
    opacity: 0.7,
  },
  checkBadge: {
    position: 'absolute',
    top: 4,
    right: 20,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.light,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moodLabel: {
    color: colors.white,
    marginTop: 8,
    fontSize: 14,
  },
  alreadyText: {
    color: colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 24,
  },
  graphLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  graphLinkText: {
    color: colors.textDark,
    fontSize: 13,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    backgroundColor: colors.darker,
    borderRadius: 24,
    paddingVertical: 30,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  modalQuestion: {
    color: colors.white,
    fontFamily: serif,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
  },
  modalMoodName: {
    color: colors.white,
    fontFamily: serif,
    fontSize: 18,
    fontWeight: '700',
    marginTop: 10,
    marginBottom: 6,
  },
  modalHint: {
    color: colors.textMuted,
    fontSize: 12,
    marginBottom: 16,
  },
  tagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 22,
  },
  tag: {
    borderWidth: 1,
    borderColor: colors.mid,
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  tagSelected: {
    backgroundColor: colors.light,
    borderColor: colors.light,
  },
  tagText: {
    color: colors.textOnDark,
    fontSize: 12,
  },
  tagTextSelected: {
    color: colors.darker,
    fontWeight: '700',
  },
  closeBtn: {
    backgroundColor: colors.pillGreen,
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 36,
  },
  closeBtnText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 14,
  },
});
