import "react-native-gesture-handler";
import React from "react";
import { LogBox, ActivityIndicator, View, Text, TouchableOpacity } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AuthProvider, AuthContext } from './src/contexts/AuthContext';
import AvisoConexao from './src/components/AvisoConexao';

// Importação das telas a partir de ./src/screens/
import HomeScreen from "./src/screens/Home";
import LoginScreen from "./src/screens/login";
import IntroScreen from "./src/screens/Intro";
import DiarioScreen from "./src/screens/Diario";
import EmocaoScreen from "./src/screens/Emocao";
import SonoScreen from "./src/screens/Sono";
import ModoCalmaScreen from "./src/screens/ModoCalma";
import GraficoScreen from "./src/screens/Grafico";
import PerfilScreen from "./src/screens/Perfil";

LogBox.ignoreLogs([
    "EventEmitter.removeListener",
]);

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Navegação de Abas (Menu Inferior)
function MainTabs() {
    return (
        <Tab.Navigator
            initialRouteName="Home"
            backBehavior="history"
            screenOptions={{
                headerShown: false,
                tabBarStyle: { display: "none" },
            }}
        >
            <Tab.Screen name="Home" component={HomeScreen} />
            <Tab.Screen name="Diario" component={DiarioScreen} />
            <Tab.Screen name="Emocao" component={EmocaoScreen} />
            <Tab.Screen name="Sono" component={SonoScreen} />
            <Tab.Screen name="ModoCalma" component={ModoCalmaScreen} />
            <Tab.Screen name="Grafico" component={GraficoScreen} />
            <Tab.Screen name="Perfil" component={PerfilScreen} />
        </Tab.Navigator>
    );
}

// A verificação da sessão não precisa bloquear o acesso ao exercício offline.
function RestaurandoScreen({ navigation }) {
    const { carregando, erroRestauracao, tentarRestaurarSessao, continuarNoLogin } = React.useContext(AuthContext);

    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#F0FCCE' }}>
            {carregando ? (
                <>
                    <ActivityIndicator size="large" color="#4E750F" />
                    <Text style={{ marginTop: 16, color: '#274804' }}>Entrando na sua conta…</Text>
                </>
            ) : (
                <>
                    <Text style={{ color: '#274804', textAlign: 'center', lineHeight: 24 }} accessibilityRole="alert">
                        {erroRestauracao}
                    </Text>
                    <TouchableOpacity onPress={tentarRestaurarSessao}
                        style={{ marginTop: 16, padding: 16, borderRadius: 24, backgroundColor: '#BBFF00' }}
                        accessibilityRole="button" accessibilityLabel="Tentar entrar novamente">
                        <Text style={{ color: '#274804', fontWeight: '700' }}>Tentar novamente</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={continuarNoLogin} style={{ padding: 16 }} accessibilityRole="button">
                        <Text style={{ color: '#274804' }}>Ir para o login</Text>
                    </TouchableOpacity>
                </>
            )}

            <TouchableOpacity
                onPress={() => navigation.navigate('CalmaUrgente')}
                style={{ marginTop: 24, padding: 16, borderRadius: 24, backgroundColor: '#BBFF00' }}
                accessibilityRole="button"
                accessibilityLabel="Abrir Calma Urgente sem esperar o login"
            >
                <Text style={{ color: '#274804', fontWeight: '700' }}>Calma Urgente</Text>
            </TouchableOpacity>
        </View>
    );
}

// Gerencia o acesso aos dados pessoais depois da validação da sessão.
function AppRoutes() {
    const { usuario, carregando, sessaoRestaurada, erroRestauracao } = React.useContext(AuthContext);
    const restaurando = carregando || !!erroRestauracao;

    return (
        <NavigationContainer>
            <Stack.Navigator key={usuario ? 'autenticado' : 'visitante'} initialRouteName={usuario ? (sessaoRestaurada ? 'MainTabs' : 'Intro') : (restaurando ? 'Restaurando' : 'Login')} screenOptions={{ headerShown: false, animation: "fade" }}>

                {restaurando && <Stack.Screen name="Restaurando" component={RestaurandoScreen} />}

                {usuario ? (
                    // Se ESTIVER logado, ele só tem acesso a essas telas:
                    <>
                        <Stack.Screen name="MainTabs" component={MainTabs} />
                        <Stack.Screen name="Intro" component={IntroScreen} />
                    </>
                ) : (
                    // A respiração é pública; dados pessoais continuam exigindo login.
                    <>
                        <Stack.Screen name="Login" component={LoginScreen} />
                        <Stack.Screen name="CalmaUrgente" component={ModoCalmaScreen} />
                    </>
                )}

            </Stack.Navigator>
        </NavigationContainer>
    );
}

export default function App() {
    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <SafeAreaProvider>
                <AuthProvider>
                    <View style={{ flex: 1 }}>
                        <AvisoConexao />
                        <AppRoutes />
                    </View>
                </AuthProvider>
            </SafeAreaProvider>
        </GestureHandlerRootView>
    );
}
