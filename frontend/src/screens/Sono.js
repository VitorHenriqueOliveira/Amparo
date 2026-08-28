import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Modal,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

export default function SonoScreen({ navigation }) {
  const [sleepTime, setSleepTime] = useState('22:30');
  const [wakeTime, setWakeTime] = useState('06:30');

  // Controle de edição dos horários
  const [modalVisible, setModalVisible] = useState(false);
  const [editType, setEditType] = useState(null); // 'sleep' ou 'wake'
  const [tempTime, setTempTime] = useState('');

  // Calcula horas e minutos totais de sono
  const calculateSleepDuration = () => {
    const [sHours, sMins] = sleepTime.split(':').map(Number);
    const [wHours, wMins] = wakeTime.split(':').map(Number);

    let startTotalMins = sHours * 60 + sMins;
    let endTotalMins = wHours * 60 + wMins;

    if (endTotalMins <= startTotalMins) {
      endTotalMins += 24 * 60; // Soma 24h para a virada da noite
    }

    const diffMins = endTotalMins - startTotalMins;
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;

    return { hours, mins, totalMins: diffMins };
  };

  const { hours, mins, totalMins } = calculateSleepDuration();

  // Meta: 7 a 8 horas (420 a 480 minutos)
  const targetMins = 480; 
  const progressPercent = Math.min(Math.round((totalMins / targetMins) * 100), 100);

  // Status de feedback
  const getStatusInfo = () => {
    if (hours < 6) {
      return { text: 'Descanso Insuficiente', color: '#f80000', icon: 'moon-outline' };
    } else if (hours >= 6 && hours < 7) {
      return { text: 'Descanso Moderado', color: '#da8700', icon: 'partly-sunny-outline' };
    }
    return { text: 'Descanso Adequado', color: '#44a300', icon: 'checkmark-circle-outline' };
  };

  const status = getStatusInfo();

  // Salvar novo horário
  const handleOpenEdit = (type) => {
    setEditType(type);
    setTempTime(type === 'sleep' ? sleepTime : wakeTime);
    setModalVisible(true);
  };

  const handleSaveTime = () => {
    // Validação simples de formato HH:MM
    const regex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (regex.test(tempTime)) {
      if (editType === 'sleep') setSleepTime(tempTime);
      if (editType === 'wake') setWakeTime(tempTime);
      setModalVisible(false);
    } else {
      alert('Por favor, digite no formato HH:MM (ex: 22:30)');
    }
  };

  return (
    <LinearGradient
      colors={['#7AA424', '#4E7810', '#253B06']}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        {/* Cabeçalho */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={28} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Sono</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Perfil')}>
            <Ionicons name="person-circle-outline" size={32} color="#FFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {/* CARD 1: TEMPO DE SONO */}
          <View style={styles.cardMain}>
            <View style={styles.moonCircle}>
              <Ionicons name="moon" size={54} color="#FFF" />
            </View>

            <Text style={styles.sleepTimeText}>
              {hours}h{mins > 0 ? `${mins}min` : ''}
            </Text>
            <Text style={styles.sleepTimeSub}>Tempo de sono</Text>

            <View style={[styles.statusBadge, { backgroundColor: status.color }]}>
              <Ionicons name={status.icon} size={18} color="#FFF" style={{ marginRight: 6 }} />
              <Text style={styles.statusBadgeText}>{status.text}</Text>
            </View>
          </View>

          {/* CARD 2: META E BARRA DE PROGRESSO */}
          <View style={styles.cardMeta}>
            <Text style={styles.metaTitle}>Sua meta</Text>
            <Text style={styles.metaSubtitle}>Meta 7 a 8 horas de sono</Text>

            <View style={styles.progressBackground}>
              <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
            </View>

            <View style={styles.progressLabels}>
              <Text style={styles.progressText}>0h</Text>
              <Text style={styles.progressText}>8h</Text>
            </View>
          </View>

          {/* CARD 3: HORÁRIOS DORMIR / ACORDAR */}
          <View style={styles.cardTimes}>
            <View style={styles.timeColumn}>
              <Ionicons name="moon-outline" size={24} color="#FFF" />
              <Text style={styles.timeLabel}>Fui dormir ás</Text>
              <Text style={styles.timeValue}>{sleepTime}</Text>
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => handleOpenEdit('sleep')}
              >
                <Text style={styles.editButtonText}>Editar</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.divider} />

            <View style={styles.timeColumn}>
              <Ionicons name="sunny-outline" size={24} color="#FFF" />
              <Text style={styles.timeLabel}>Acordei ás</Text>
              <Text style={styles.timeValue}>{wakeTime}</Text>
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => handleOpenEdit('wake')}
              >
                <Text style={styles.editButtonText}>Editar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* MODAL PARA EDITAR HORÁRIO */}
        <Modal visible={modalVisible} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>
                {editType === 'sleep' ? 'Fui dormir ás:' : 'Acordei ás:'}
              </Text>

              <TextInput
                style={styles.modalInput}
                value={tempTime}
                onChangeText={setTempTime}
                placeholder="HH:MM"
                placeholderTextColor="#999"
                keyboardType="numbers-and-punctuation"
                maxLength={5}
              />

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalCancel}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.modalCancelText}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalSave}
                  onPress={handleSaveTime}
                >
                  <Text style={styles.modalSaveText}>Salvar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
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
    paddingBottom: 15,
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#FFF' },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'space-evenly',
    paddingBottom: 20,
  },
  // Card 1
  cardMain: {
    backgroundColor: '#2B4808',
    borderRadius: 24,
    paddingVertical: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  moonCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#436B09',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  sleepTimeText: { fontSize: 32, fontWeight: 'bold', color: '#FFF' },
  sleepTimeSub: { fontSize: 14, color: '#E0F0C0', marginBottom: 14 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  statusBadgeText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
  // Card 2
  cardMeta: {
    backgroundColor: '#2B4808',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  metaTitle: { fontSize: 16, fontWeight: 'bold', color: '#FFF' },
  metaSubtitle: { fontSize: 13, color: '#E0F0C0', marginBottom: 12 },
  progressBackground: {
    height: 14,
    backgroundColor: '#1A2E03',
    borderRadius: 7,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#7AA424',
    borderRadius: 7,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  progressText: { fontSize: 12, color: 'rgba(255,255,255,0.6)' },
  // Card 3
  cardTimes: {
    backgroundColor: '#2B4808',
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  timeColumn: { flex: 1, alignItems: 'center' },
  divider: { width: 1, height: '80%', backgroundColor: 'rgba(255,255,255,0.2)' },
  timeLabel: { fontSize: 12, color: '#E0F0C0', marginTop: 4 },
  timeValue: { fontSize: 20, fontWeight: 'bold', color: '#FFF', marginVertical: 6 },
  editButton: {
    backgroundColor: '#436B09',
    paddingVertical: 6,
    paddingHorizontal: 20,
    borderRadius: 14,
  },
  editButtonText: { color: '#FFF', fontSize: 13, fontWeight: 'bold' },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    backgroundColor: '#2B4808',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#FFF', marginBottom: 15 },
  modalInput: {
    backgroundColor: '#1A2E03',
    color: '#FFF',
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    width: '100%',
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 20,
  },
  modalActions: { flexDirection: 'row', gap: 15 },
  modalCancel: { paddingVertical: 10, paddingHorizontal: 15 },
  modalCancelText: { color: '#A2C876', fontSize: 15, fontWeight: '600' },
  modalSave: {
    backgroundColor: '#4E7810',
    paddingVertical: 10,
    paddingHorizontal: 25,
    borderRadius: 14,
  },
  modalSaveText: { color: '#FFF', fontSize: 15, fontWeight: 'bold' },
});