import React, { createContext, useState, useEffect } from 'react';
import { restaurarSessao, iniciarSessao, encerrarSessao, salvarUsuario } from '../services/sessao';

export const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [sessaoRestaurada, setSessaoRestaurada] = useState(false);

  useEffect(() => {
    let ativo = true;
    async function carregar() {
      try {
        const salvo = await restaurarSessao();
        if (ativo && salvo) {
          setSessaoRestaurada(true);
          setUsuario(salvo);
        }
      } catch {
        console.error('Não foi possível restaurar a sessão.');
      } finally {
        if (ativo) setCarregando(false);
      }
    }
    carregar();
    return () => { ativo = false; };
  }, []);

  async function login(dadosUsuario, token) {
    await iniciarSessao(dadosUsuario, token);
    setSessaoRestaurada(false);
    setUsuario(dadosUsuario);
  }

  async function logout() {
    await encerrarSessao();
    setUsuario(null);
    setSessaoRestaurada(false);
  }

  async function atualizarNome(nome) {
    const atualizado = { ...usuario, nome };
    await salvarUsuario(atualizado);
    setUsuario(atualizado);
  }

  return (
    <AuthContext.Provider value={{ usuario, login, logout, atualizarNome, carregando, sessaoRestaurada }}>
      {children}
    </AuthContext.Provider>
  );
}
