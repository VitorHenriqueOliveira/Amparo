import "react-native-gesture-handler";
import React from "react";
import { LogBox, ActivityIndicator, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AuthProvider, AuthContext } from './src/contexts/AuthContext';

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
    "Animated: `useNativeDriver`",
    "EventEmitter.removeListener",
]);

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Navegação de Abas (Menu Inferior)
function MainTabs() {
    return (
        <Tab.Navigator
            initialRouteName="Home"
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

// 1. Gerencia quem está logado ou não
function AppRoutes() {
    const { usuario, carregando, sessaoRestaurada } = React.useContext(AuthContext);

    // Tela de carregamento enquanto o AsyncStorage procura o usuário
    if (carregando) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#4E750F" />
            </View>
        );
    }

    return (
        <NavigationContainer>
            <Stack.Navigator key={usuario ? 'autenticado' : 'visitante'} initialRouteName={usuario ? (sessaoRestaurada ? 'MainTabs' : 'Intro') : 'Login'} screenOptions={{ headerShown: false, animation: "fade" }}>

                {usuario ? (
                    // Se ESTIVER logado, ele só tem acesso a essas telas:
                    <>
                        <Stack.Screen name="MainTabs" component={MainTabs} />
                        <Stack.Screen name="Intro" component={IntroScreen} />
                    </>
                ) : (
                    // Se NÃO ESTIVER logado, ele fica preso no Login:
                    <Stack.Screen name="Login" component={LoginScreen} />
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
                    <AppRoutes />
                </AuthProvider>
            </SafeAreaProvider>
        </GestureHandlerRootView>
    );
}