import React, { useState, useContext } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
import { AuthContext } from '../contexts/AuthContext';

export default function LoginScreen({ navigation }) {
    const [email, setEmail] = useState('');
    const [senha, setSenha] = useState('');
    const { login } = useContext(AuthContext);

    // Função que conversa com o Backend
    const handleLogin = async () => {
        // Validação básica para não enviar campos vazios
        if (!email.trim() || !senha.trim()) {
            Alert.alert('Atenção', 'Por favor, preencha seu e-mail e senha.');
            return;
        }

        try {
            // Dispara a requisição para a rota
            const response = await api.post('/login', {
                email: email.toLowerCase().trim(),
                senha: senha
            });

            // Salvando os dados no contexto e no AsyncStorage
            const dadosUsuario = response.data;
            await login(dadosUsuario);

        } catch (error) {
            // Se deu erro (Status 401), avisa o usuário
            Alert.alert('Erro de Acesso', 'E-mail ou senha incorretos. Tente novamente.');
            console.log('Falha no login:', error);
        }
    };

    return (
        <LinearGradient
            colors={['#D2E77D', '#6E9C17', '#45690B']}
            style={styles.container}
        >
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.content}>
                    {/* Topo / Logo */}
                    <View style={styles.logoContainer}>
                        <Ionicons name="sunny" size={100} color="#FFD700" />
                        <Text style={styles.welcomeText}>Bem-Vindo a</Text>
                        <Text style={styles.brandText}>Amparo</Text>
                    </View>

                    {/* Formulário */}
                    <View style={styles.formContainer}>
                        <TextInput
                            style={styles.input}
                            placeholder="Email"
                            placeholderTextColor="#A2C876"
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />

                        <TextInput
                            style={styles.input}
                            placeholder="Senha"
                            placeholderTextColor="#A2C876"
                            secureTextEntry
                            value={senha}
                            onChangeText={setSenha}
                        />

                        <TouchableOpacity style={styles.forgotButton}>
                            <Text style={styles.forgotText}>Esqueceu a senha?</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.loginButton}
                            onPress={handleLogin}
                        >
                            <Text style={styles.loginButtonText}>Entrar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </SafeAreaView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    safeArea: { flex: 1 },
    content: {
        flex: 1,
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingHorizontal: 30,
        paddingVertical: 20,
    },
    logoContainer: {
        alignItems: 'center',
        marginTop: 40,
    },
    welcomeText: {
        fontSize: 32,
        fontStyle: 'italic',
        color: '#344E07',
        marginTop: 10,
    },
    brandText: {
        fontSize: 38,
        fontWeight: 'bold',
        fontStyle: 'italic',
        color: '#2A4004',
    },
    formContainer: {
        width: '100%',
        alignItems: 'center',
        marginBottom: 40,
    },
    input: {
        width: '100%',
        height: 50,
        backgroundColor: '#4E750F',
        borderRadius: 25,
        paddingHorizontal: 20,
        color: '#FFF',
        fontSize: 16,
        marginBottom: 15,
    },
    forgotButton: {
        alignSelf: 'flex-start',
        marginLeft: 15,
        marginBottom: 35,
    },
    forgotText: {
        color: '#2A4004',
        fontSize: 14,
        fontWeight: '600',
    },
    loginButton: {
        width: '60%',
        height: 50,
        backgroundColor: '#4E750F',
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    loginButtonText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
});