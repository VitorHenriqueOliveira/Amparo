import React, { createContext, useState, useEffect, useRef, useCallback } from 'react';
import { AppState } from 'react-native';
import { observarFalhaAutenticacao } from '../services/api';
import { sincronizarCiclosCalma } from '../services/calma';
import { sincronizarHistoricosAntigos } from '../services/historicos';
import { buscarPerfil, atualizarPerfil, atualizarNotificacoes } from '../services/usuario';
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
    const versaoSessao = useRef(0);
    const [revisaoHistoricos, setRevisaoHistoricos] = useState(0);
    const idUsuario = usuario?.id_usuario;

    useEffect(() => {
        if (!idUsuario) return;
        let ativo = true;
        const versao = versaoSessao.current;

        // A tarefa é única por conta nesta abertura e não bloqueia a navegação.
        sincronizarHistoricosAntigos(idUsuario).catch(() => {
            // Os originais e os recibos confirmados permitem continuar na próxima abertura.
        }).then(() => {
            if (ativo && versao === versaoSessao.current) {
                setRevisaoHistoricos((atual) => atual + 1);
            }
        });

        return () => { ativo = false; };
    }, [idUsuario]);

    useEffect(() => {
        if (!usuario?.id_usuario) {
            return;
        }

        function sincronizar() {
            if (AppState.currentState === 'active') {
                // Sem conexão, os ciclos continuam guardados na fila desta conta.
                sincronizarCiclosCalma(usuario.id_usuario).catch(() => {});
            }
        }

        sincronizar();

        const intervalo = setInterval(sincronizar, 30000);
        const estadoApp = AppState.addEventListener('change', (estado) => {
            if (estado === 'active') {
                sincronizar();
            }
        });

        return () => {
            clearInterval(intervalo);
            estadoApp.remove();
        };
    }, [usuario?.id_usuario]);

    useEffect(() => {
        let ativo = true;

        function invalidarSessao() {
            versaoSessao.current++;
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
        versaoSessao.current++;
        setSessaoRestaurada(false);
        setUsuario(dadosUsuario);
    }

    async function logout() {
        versaoSessao.current++;
        try {
            await encerrarSessao();
        } finally {
            setUsuario(null);
            setSessaoRestaurada(false);
        }
    }

    const aplicarPerfil = useCallback(async (consultar) => {
        const versaoAtual = versaoSessao.current;
        const atualizado = await consultar();

        // Respostas de uma conta anterior não podem reabrir a sessão nem trocar o perfil.
        if (versaoAtual !== versaoSessao.current || atualizado.id_usuario !== usuario?.id_usuario) {
            throw new Error('A sessão mudou. Entre novamente para atualizar o perfil.');
        }

        await salvarUsuario(atualizado).catch(() => {
            console.error('Não foi possível atualizar os dados locais do perfil.');
        });

        setUsuario((atual) => versaoAtual === versaoSessao.current && atual?.id_usuario === atualizado.id_usuario
            ? atualizado : atual);

        return atualizado;
    }, [usuario?.id_usuario]);

    const recarregarPerfil = useCallback(() => aplicarPerfil(buscarPerfil), [aplicarPerfil]);
    const atualizarNome = useCallback((nome) => aplicarPerfil(() => atualizarPerfil(nome)), [aplicarPerfil]);
    const salvarNotificacoes = useCallback((valor) => aplicarPerfil(() => atualizarNotificacoes(valor)), [aplicarPerfil]);

    return (
        <AuthContext.Provider value={{ usuario, login, logout, atualizarNome, recarregarPerfil, salvarNotificacoes,
            carregando, sessaoRestaurada, revisaoHistoricos }}>
            {children}
        </AuthContext.Provider>
    );
}
