import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 1. Contexto
export const AuthContext = createContext({});

// 2. Provedor que vai "abraçar" o app inteiro
export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [carregando, setCarregando] = useState(true);

  // Assim que o app abre, ele verifica se tem alguém salvo na memória do celular
  useEffect(() => {
    async function carregarDadosStorage() {
      const usuarioStorage = await AsyncStorage.getItem('@Amparo:usuario');
      
      if (usuarioStorage) {
        setUsuario(JSON.parse(usuarioStorage));
      }
      setCarregando(false);
    }
    carregarDadosStorage();
  }, []);

  // Função para logar: salva no estado (Context API) e no celular (AsyncStorage)
  async function login(dadosUsuario) {
    setUsuario(dadosUsuario);
    await AsyncStorage.setItem('@Amparo:usuario', JSON.stringify(dadosUsuario));
  }

  // Função para deslogar: limpa tudo
  async function logout() {
    setUsuario(null);
    await AsyncStorage.removeItem('@Amparo:usuario');
  }

  return (
    <AuthContext.Provider value={{ usuario, login, logout, carregando }}>
      {children}
    </AuthContext.Provider>
  );
}