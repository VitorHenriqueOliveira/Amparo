import "react-native-gesture-handler";
import React from "react";
import { LogBox } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";

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
        tabBarStyle: { display: "none" }, // <--- ESSA LINHA ESCONDE A BARRA PADRÃO/DE FORA
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

// Navegação Principal
export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Login"
        screenOptions={{
          headerShown: false,
          animation: "fade",
          animationDuration: 300,
        }}
      >
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Intro" component={IntroScreen} />
        <Stack.Screen name="MainTabs" component={MainTabs} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}