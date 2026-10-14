import React, { createContext, useState, useEffect } from 'react';
import { AppState } from 'react-native';
import { observarFalhaAutenticacao } from '../services/api';
import {
    restaurarSessao,
    iniciarSessao,
    encerrarSessao,
    salvarUsuario,
    observarExpiracao,
    verificarExpiracao,
} from '../services/sessao';

export const AuthContext = createContext({});

export function AuthProvider({ children }) {
    const [usuario, setUsuario] = useState(null);
    const [carregando, setCarregando] = useState(true);
    const [sessaoRestaurada, setSessaoRestaurada] = useState(false);

    useEffect(() => {
        let ativo = true;

        function invalidarSessao() {
            // Fecha as telas privadas imediatamente, mesmo se a limpeza local falhar.
            setUsuario(null);
            setSessaoRestaurada(false);

            encerrarSessao().catch(() => {
                console.error('Não foi possível limpar os dados locais da sessão.');
            });
        }

        const pararFalhas = observarFalhaAutenticacao(invalidarSessao);
        const pararExpiracao = observarExpiracao(invalidarSessao);
        const estadoApp = AppState.addEventListener('change', (estado) => {
            if (estado === 'active') {
                verificarExpiracao();
            }
        });

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
                if (ativo) {
                    setCarregando(false);
                }
            }
        }

        carregar();

        return () => {
            ativo = false;
            pararFalhas();
            pararExpiracao();
            estadoApp.remove();
        };
    }, []);

    async function login(dadosUsuario, token) {
        await iniciarSessao(dadosUsuario, token);
        setSessaoRestaurada(false);
        setUsuario(dadosUsuario);
    }

    async function logout() {
        try {
            await encerrarSessao();
        } finally {
            setUsuario(null);
            setSessaoRestaurada(false);
        }
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
