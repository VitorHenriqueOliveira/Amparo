import api from './api';

function validarPerfil(usuario) {
    if (!Number.isSafeInteger(usuario?.id_usuario) || usuario.id_usuario <= 0 ||
        typeof usuario.nome !== 'string' || !usuario.nome.trim() ||
        typeof usuario.st_notificacao !== 'boolean') {
        throw new Error('Não foi possível carregar os dados do perfil.');
    }

    return usuario;
}

export async function buscarPerfil() {
    const { data } = await api.get('/perfil');

    return validarPerfil(data.usuario);
}

export async function atualizarPerfil(nome) {
    if (typeof nome !== 'string' || !nome.trim() || nome.trim().length > 100) {
        throw new Error('Informe um nome com até 100 caracteres.');
    }

    const { data } = await api.put('/perfil', { nome: nome.trim() });

    return validarPerfil(data.usuario);
}

export async function atualizarNotificacoes(notificacoes) {
    if (typeof notificacoes !== 'boolean') {
        throw new Error('Informe uma preferência de notificações válida.');
    }

    const { data } = await api.put('/perfil/notificacoes', { st_notificacao: notificacoes });

    return validarPerfil(data.usuario);
}
