import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Animated,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');

  // Animações iguais às da Home
  const sunScale = useRef(new Animated.Value(1)).current;
  const sunGlow = useRef(new Animated.Value(0.55)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(sunScale, {
            toValue: 1.12,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(sunScale, {
            toValue: 1,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(sunGlow, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(sunGlow, {
            toValue: 0.55,
            duration: 1500,
            useNativeDriver: true,
          }),
        ]),
      ])
    );

    animation.start();

    return () => animation.stop();
  }, [sunScale, sunGlow]);

  return (
    <LinearGradient
      colors={['#bbff00', '#f0fcce', '#72a600']}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>

        {/* TOPO */}
        <LinearGradient
          colors={['#325709', '#274804']}
          style={styles.headerBar}
        >
          <View style={styles.headerLogo}>
            <Ionicons
              name="sunny"
              size={28}
              color="#bbff00"
            />
          </View>

          <Text style={styles.headerTitle}>
            Amparo
          </Text>

          <View style={styles.headerRight} />
        </LinearGradient>

        {/* ÁREA PRINCIPAL */}
        <View style={styles.mainContent}>
          <LinearGradient
            colors={['#3A6B0A', '#234104', '#142702']}
            style={styles.loginCard}
          >

            {/* SOL ANIMADO E SAUDAÇÃO */}
            <View style={styles.logoContainer}>
              <Animated.View
                style={[
                  styles.sunGlow,
                  {
                    opacity: sunGlow,
                    transform: [{ scale: sunScale }],
                  },
                ]}
              >
                <View style={styles.sunInnerGlow}>
                  <Ionicons
                    name="sunny"
                    size={96}
                    color="#ffcc00"
                  />
                </View>
              </Animated.View>

              <Text style={styles.welcomeText}>
                Bem-vindo
              </Text>

              <Text style={styles.subtitleText}>
                Entre na sua conta
              </Text>
            </View>

            {/* FORMULÁRIO */}
            <View style={styles.formContainer}>

              {/* EMAIL */}
              <View style={styles.inputWrapper}>
                <Ionicons
                  name="mail-outline"
                  size={22}
                  color="#bbff00"
                  style={styles.inputIcon}
                />

                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  placeholderTextColor="#AFC88A"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              {/* SENHA */}
              <View style={styles.inputWrapper}>
                <Ionicons
                  name="lock-closed-outline"
                  size={22}
                  color="#bbff00"
                  style={styles.inputIcon}
                />

                <TextInput
                  style={styles.input}
                  placeholder="Senha"
                  placeholderTextColor="#AFC88A"
                  secureTextEntry
                  value={senha}
                  onChangeText={setSenha}
                />
              </View>

              {/* ESQUECEU A SENHA */}
              <TouchableOpacity
                style={styles.forgotButton}
                activeOpacity={0.7}
              >
                <Text style={styles.forgotText}>
                  Esqueceu a senha?
                </Text>
              </TouchableOpacity>

              {/* BOTÃO ENTRAR */}
              <TouchableOpacity
                style={styles.loginButton}
                onPress={() => navigation.navigate('Intro')}
                activeOpacity={0.8}
              >
                <Text style={styles.loginButtonText}>
                  Entrar
                </Text>

                <Ionicons
                  name="arrow-forward"
                  size={21}
                  color="#274804"
                />
              </TouchableOpacity>

            </View>
          </LinearGradient>
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

  // HEADER
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 20,
    height: 64,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },

  headerLogo: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: '#FFF',
    fontSize: 21,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  headerRight: {
    width: 40,
  },

  // CONTEÚDO
  mainContent: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 25,
  },

  // CARD
  loginCard: {
    width: '100%',
    borderRadius: 32,
    paddingHorizontal: 24,
    paddingVertical: 34,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(187,255,0,0.3)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 12,
  },

  // SOL ANIMADO IGUAL AO DA HOME
  logoContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },

  sunGlow: {
    width: 126,
    height: 126,
    borderRadius: 63,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    backgroundColor: 'rgba(255,216,61,0.10)',
    shadowColor: '#fecb00',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 1,
    shadowRadius: 22,
    elevation: 12,
  },

  sunInnerGlow: {
    width: 112,
    height: 112,
    borderRadius: 56,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,216,61,0.08)',
  },

  welcomeText: {
    color: '#bbff00',
    fontSize: 29,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 0.5,
  },

  subtitleText: {
    color: '#f0fcce',
    fontSize: 15,
    fontWeight: '500',
    marginTop: 7,
    textAlign: 'center',
  },

  // FORMULÁRIO
  formContainer: {
    width: '100%',
    alignItems: 'center',
  },

  inputWrapper: {
    width: '100%',
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 28,
    marginBottom: 15,
    paddingHorizontal: 17,
  },

  inputIcon: {
    marginRight: 10,
  },

  input: {
    flex: 1,
    height: '100%',
    color: '#FFF',
    fontSize: 16,
    paddingVertical: 0,
  },

  // ESQUECEU SENHA
  forgotButton: {
    alignSelf: 'flex-end',
    marginTop: 1,
    marginBottom: 25,
    paddingHorizontal: 5,
  },

  forgotText: {
    color: '#bbff00',
    fontSize: 14,
    fontWeight: '700',
  },

  // BOTÃO ENTRAR
  loginButton: {
    width: '72%',
    minHeight: 55,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 9,
    backgroundColor: '#bbff00',
    borderRadius: 30,
    shadowColor: '#bbff00',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },

  loginButtonText: {
    color: '#274804',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});