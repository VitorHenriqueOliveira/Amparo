import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  Switch,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../contexts/AuthContext';

const NAV_ITEMS = [
  { name: 'book-outline', route: 'Diario', label: 'Diário' },
  { name: 'happy-outline', route: 'Emocao', label: 'Emoção' },
  { name: 'moon-outline', route: 'Sono', label: 'Sono' },
  { name: 'trending-up-outline', route: 'Grafico', label: 'Evolução' },
  { name: 'heart-outline', route: 'ModoCalma', label: 'Calma' },
];

export default function Perfil({ navigation }) {
  const { usuario, logout, atualizarNome } = useContext(AuthContext);
  const nome = usuario.nome || 'Seu Nome';
  const [nomeEditado, setNomeEditado] = useState(nome);
  const [notificacoes, setNotificacoes] = useState(true);
  const [modalVisivel, setModalVisivel] = useState(false);

  function abrirEdicao() {
    setNomeEditado(nome === 'Seu Nome' ? '' : nome);
    setModalVisivel(true);
  }

  async function salvarNome() {
    const nomeFinal = nomeEditado.trim();

    if (!nomeFinal) {
      Alert.alert('Ops!', 'Digite seu nome antes de salvar.');
      return;
    }

    try {
      await atualizarNome(nomeFinal);
      setModalVisivel(false);
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar o nome. Tente novamente.');
    }
  }

  function sairDaConta() {
    const confirmarSaida = async () => {
      try { await logout(); }
      catch {
        if (Platform.OS === 'web') window.alert('Não foi possível sair. Tente novamente.');
        else Alert.alert('Erro', 'Não foi possível sair. Tente novamente.');
      }
    };
    if (Platform.OS === 'web') {
      if (window.confirm('Tem certeza de que deseja sair da conta?')) confirmarSaida();
    } else {
      Alert.alert('Sair da conta', 'Tem certeza de que deseja sair?', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Sair', style: 'destructive', onPress: confirmarSaida },
      ]);
    }
  }

  function voltar() {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Home');
    }
  }

  return (
    <LinearGradient
      colors={['#bbff00', '#f0fcce', '#72a600']}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" backgroundColor="#162802" />

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          {/* CABEÇALHO SEM O ÍCONE DO CANTO DIREITO */}
          <LinearGradient
            colors={['#2A4705', '#162802']}
            style={styles.headerBox}
          >
            <TouchableOpacity
              onPress={voltar}
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

            <Text style={styles.headerTitle}>Meu Perfil</Text>

            <View style={styles.headerSpacer} />
          </LinearGradient>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* CARD DO PERFIL */}
            <LinearGradient
              colors={['#498610', '#223f00', '#101B04']}
              style={styles.profileCard}
            >
              <View style={styles.profileTop}>
                <View style={styles.avatar}>
                  <Ionicons
                    name="person-outline"
                    size={43}
                    color="#162802"
                  />
                  <View style={styles.avatarBadge}>
                    <Ionicons
                      name="leaf"
                      size={12}
                      color="#162802"
                    />
                  </View>
                </View>

                <View style={styles.profileInfo}>
                  <Text style={styles.eyebrow}>
                    SEU ESPAÇO, SEU TEMPO
                  </Text>
                  <Text style={styles.userName}>{nome}</Text>
                  <Text style={styles.userSubtitle}>
                    Um passo de cada vez. 💚
                  </Text>
                </View>
              </View>

              <View style={styles.profileDivider} />

              <View style={styles.profileFooter}>
                <Ionicons
                  name="leaf-outline"
                  size={17}
                  color="#BDE868"
                />
                <Text style={styles.profileFooterText}>
                  Cuide de você com carinho.
                </Text>
              </View>

              <TouchableOpacity
                style={styles.editProfileButton}
                onPress={abrirEdicao}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="pencil-outline"
                  size={16}
                  color="#162802"
                />
                <Text style={styles.editProfileText}>
                  Editar perfil
                </Text>
              </TouchableOpacity>
            </LinearGradient>

            {/* CONFIGURAÇÕES */}
            <View style={styles.sectionHeading}>
              <View>
                <Text style={styles.sectionTitle}>Seu espaço</Text>
                <Text style={styles.sectionSubtitle}>
                  Deixe tudo do seu jeito.
                </Text>
              </View>

              <View style={styles.sectionIcon}>
                <Ionicons
                  name="settings-outline"
                  size={22}
                  color="#2A4705"
                />
              </View>
            </View>

            {/* CARD DE NOTIFICAÇÕES */}
            <LinearGradient
              colors={['#498610', '#223f00', '#101B04']}
              style={styles.settingCard}
            >
              <View style={styles.settingIcon}>
                <Ionicons
                  name="notifications-outline"
                  size={23}
                  color="#BDE868"
                />
              </View>

              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>
                  Notificações
                </Text>
                <Text style={styles.settingSubtitle}>
                  {notificacoes
                    ? 'Lembretes ativados'
                    : 'Lembretes desativados'}
                </Text>
              </View>

              <Switch
                value={notificacoes}
                onValueChange={setNotificacoes}
                trackColor={{
                  false: 'rgba(255,255,255,0.25)',
                  true: '#96C433',
                }}
                thumbColor={notificacoes ? '#D5FF73' : '#eeeeee'}
                ios_backgroundColor="rgba(255,255,255,0.25)"
                accessibilityLabel="Ativar ou desativar notificações"
              />
            </LinearGradient>

            {/* CARD MOTIVACIONAL */}
            <LinearGradient
              colors={['#498610', '#223f00', '#101B04']}
              style={styles.messageCard}
            >
              <View style={styles.sunContainer}>
                <Ionicons
                  name="sunny"
                  size={43}
                  color="#D5FF73"
                />
              </View>

              <Text style={styles.messageEyebrow}>
                UM LEMBRETE PARA VOCÊ
              </Text>

              <Text style={styles.messageQuote}>
                “Sua mente é o seu jardim mais precioso. Cuidar de si
                também é aprender a caminhar com gentileza.”
              </Text>

              <View style={styles.messageDivider} />

              <Text style={styles.messageFooter}>
                Você não precisa dar conta de tudo hoje.
              </Text>

              <View style={styles.signature}>
                <Ionicons
                  name="heart"
                  size={14}
                  color="#BDE868"
                />
                <Text style={styles.signatureText}>
                  Com carinho, Amparo
                </Text>
              </View>
            </LinearGradient>

            {/* CARD DE AUTOCUIDADO */}
            <View style={styles.careCard}>
              <View style={styles.careIcon}>
                <Ionicons
                  name="flower-outline"
                  size={25}
                  color="#BDE868"
                />
              </View>

              <View style={styles.careContent}>
                <Text style={styles.careTitle}>
                  Respeite seu ritmo
                </Text>
                <Text style={styles.careText}>
                  Pequenos momentos de cuidado também importam.
                  Vá no seu tempo e acolha o que sente.
                </Text>
              </View>
            </View>

            {/* SAIR DA CONTA */}
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={sairDaConta}
              activeOpacity={0.8}
            >
              <Ionicons
                name="log-out-outline"
                size={20}
                color="#FF9999"
              />
              <Text style={styles.logoutText}>Sair da conta</Text>
            </TouchableOpacity>

            <Text style={styles.versionText}>
              AMPARO • UM DIA DE CADA VEZ
            </Text>
          </ScrollView>

          {/* BARRA INFERIOR IGUAL À DO DIÁRIO */}
          <LinearGradient
            colors={['#2A4705', '#162802']}
            style={styles.bottomNavbar}
          >
            {NAV_ITEMS.map((item) => {
              const ativo = item.route === 'Perfil';

              return (
                <TouchableOpacity
                  key={item.route}
                  style={styles.navItem}
                  onPress={() => navigation.navigate(item.route)}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel={item.label}
                >
                  {ativo ? (
                    <View style={styles.activeCircleIcon}>
                      <Ionicons
                        name={item.name}
                        size={22}
                        color="#162704"
                      />
                    </View>
                  ) : (
                    <Ionicons
                      name={item.name}
                      size={24}
                      color="rgba(255,255,255,0.7)"
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </LinearGradient>
        </View>
      </SafeAreaView>

      {/* MODAL PARA EDITAR O NOME */}
      <Modal
        visible={modalVisivel}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisivel(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalCard}>
            <LinearGradient
              colors={['#2A4705', '#162802']}
              style={styles.modalIcon}
            >
              <Ionicons
                name="person-outline"
                size={28}
                color="#BDE868"
              />
            </LinearGradient>

            <Text style={styles.modalTitle}>
              Como podemos te chamar?
            </Text>
            <Text style={styles.modalSubtitle}>
              Escolha o nome que aparecerá no seu perfil.
            </Text>

            <TextInput
              style={styles.nameInput}
              value={nomeEditado}
              onChangeText={setNomeEditado}
              placeholder="Digite seu nome"
              placeholderTextColor="#879182"
              autoFocus
              maxLength={40}
              returnKeyType="done"
              onSubmitEditing={salvarNome}
            />

            <TouchableOpacity
              style={styles.saveButton}
              onPress={salvarNome}
              activeOpacity={0.8}
            >
              <Text style={styles.saveButtonText}>
                Salvar alterações
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setModalVisivel(false)}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
    letterSpacing: 0.5,
  },
  headerSpacer: {
    width: 24,
  },

  scroll: {
    flex: 1,
    marginHorizontal: 16,
    marginBottom: 10,
  },
  scrollContent: {
    paddingBottom: 20,
  },

  profileCard: {
    borderRadius: 28,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(189,232,104,0.25)',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  profileTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  avatar: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: '#F0FCCE',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#BDE868',
  },
  avatarBadge: {
    position: 'absolute',
    right: -2,
    bottom: -1,
    width: 25,
    height: 25,
    borderRadius: 13,
    backgroundColor: '#D5FF73',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#223f00',
  },
  profileInfo: {
    flex: 1,
  },
  eyebrow: {
    color: '#BDE868',
    fontSize: 9,
    letterSpacing: 1,
    fontWeight: '800',
    marginBottom: 6,
  },
  userName: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
  },
  userSubtitle: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 12,
    marginTop: 6,
  },
  profileDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.13)',
    marginTop: 19,
    marginBottom: 13,
  },
  profileFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  profileFooterText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
  },
  editProfileButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 17,
    backgroundColor: '#D5FF73',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
  },
  editProfileText: {
    color: '#162802',
    fontSize: 13,
    fontWeight: '800',
  },

  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 23,
    marginBottom: 13,
    paddingHorizontal: 3,
  },
  sectionTitle: {
    color: '#162802',
    fontSize: 22,
    fontWeight: '800',
  },
  sectionSubtitle: {
    color: '#35551C',
    fontSize: 12,
    marginTop: 4,
  },
  sectionIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  settingCard: {
    borderRadius: 20,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(189,232,104,0.2)',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  settingIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(189,232,104,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(189,232,104,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingText: {
    flex: 1,
    marginLeft: 12,
  },
  settingTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  settingSubtitle: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 11,
    marginTop: 5,
  },

  messageCard: {
    marginTop: 15,
    borderRadius: 24,
    padding: 21,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(189,232,104,0.2)',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  sunContainer: {
    width: 59,
    height: 59,
    borderRadius: 20,
    backgroundColor: 'rgba(189,232,104,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  messageEyebrow: {
    color: '#BDE868',
    fontSize: 10,
    letterSpacing: 1.4,
    fontWeight: '800',
    marginBottom: 13,
    textAlign: 'center',
  },
  messageQuote: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 25,
    textAlign: 'center',
  },
  messageDivider: {
    width: 43,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#95CD33',
    marginVertical: 16,
  },
  messageFooter: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 12,
    lineHeight: 19,
    textAlign: 'center',
  },
  signature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
  },
  signatureText: {
    color: '#BDE868',
    fontSize: 11,
    fontWeight: '700',
  },

  careCard: {
    backgroundColor: 'rgba(28,48,7,0.92)',
    borderRadius: 18,
    marginTop: 15,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(189,232,104,0.2)',
    elevation: 3,
  },
  careIcon: {
    width: 53,
    alignSelf: 'stretch',
    backgroundColor: 'rgba(149,205,51,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  careContent: {
    flex: 1,
    padding: 14,
  },
  careTitle: {
    color: '#BDE868',
    fontSize: 14,
    fontWeight: '800',
  },
  careText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 5,
  },

  logoutButton: {
    marginTop: 18,
    height: 50,
    borderRadius: 16,
    backgroundColor: 'rgba(28,48,7,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255,128,128,0.28)',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 9,
  },
  logoutText: {
    color: '#FF9999',
    fontSize: 14,
    fontWeight: '700',
  },
  versionText: {
    textAlign: 'center',
    color: '#35551C',
    fontSize: 9,
    letterSpacing: 1.6,
    fontWeight: '700',
    marginTop: 17,
    marginBottom: 5,
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
    shadowOffset: { width: 0, height: 3 },
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
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 4,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(10,25,4,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#F0FCCE',
    borderRadius: 27,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(42,71,5,0.15)',
  },
  modalIcon: {
    width: 58,
    height: 58,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    color: '#162802',
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  modalSubtitle: {
    color: '#526642',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    marginTop: 8,
    marginBottom: 20,
  },
  nameInput: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#B7D77C',
    paddingHorizontal: 15,
    paddingVertical: 13,
    color: '#162802',
    fontSize: 15,
  },
  saveButton: {
    width: '100%',
    backgroundColor: '#95CD33',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 17,
  },
  saveButtonText: {
    color: '#162802',
    fontWeight: '800',
    fontSize: 14,
  },
  cancelButton: {
    paddingVertical: 13,
    paddingHorizontal: 20,
    marginTop: 2,
  },
  cancelButtonText: {
    color: '#35551C',
    fontSize: 13,
    fontWeight: '600',
  },
});