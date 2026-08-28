import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

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
      const tokeStorage = await AsyncStorage.getItem('@Amparo:token');
      
      if (usuarioStorage && tokeStorage) {
        api.defaults.headers.common['Authorization'] = `Bearer ${tokenStorage}`;        
        setUsuario(JSON.parse(usuarioStorage));
      }
      setCarregando(false);
    }
    carregarDadosStorage();
  }, []);

  // Função para logar: salva no estado (Context API) e no celular (AsyncStorage), além de receber o token
  async function login(dadosUsuario, token) {
    // Cola o token no Axios
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`
    
    setUsuario(dadosUsuario);

    await AsyncStorage.setItem('@Amparo:usuario', JSON.stringify(dadosUsuario));
    await AsyncStorage.setItem('@Amparo:token', token);
  }

  // Função para deslogar: limpa tudo
  async function logout() {
    // Tira o token do Axios
    api.defaults.headers.common['Authorization'] = '';
    
    setUsuario(null);

    await AsyncStorage.removeItem('@Amparo:usuario');
    await AsyncStorage.removeItem('@Amparo:token')
  }

  return (
    <AuthContext.Provider value={{ usuario, login, logout, carregando }}>
      {children}
    </AuthContext.Provider>
  );
}