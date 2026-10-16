import api from './api';

export async function atualizarPerfil(nome) {
    if (typeof nome !== 'string' || !nome.trim() || nome.trim().length > 100) {
        throw new Error('Informe um nome com até 100 caracteres.');
    }

    const { data } = await api.put('/perfil', { nome: nome.trim() });

    return data.usuario;
}
