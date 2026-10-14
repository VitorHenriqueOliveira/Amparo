import api from './api';

function adaptarNota(nota) {
  const valor = nota.data_registro;
  const data = new Date(/^\d{4}-\d{2}-\d{2}$/.test(valor) ? valor + 'T12:00:00' : valor);
  return {
    id: nota.id_diario,
    text: nota.descricao,
    date: data.toLocaleDateString('pt-BR'),
    createdAt: valor,
  };
}

export async function listarDiario(idUsuario) {
  const { data } = await api.get('/diario/' + idUsuario);
  return data.map(adaptarNota);
}

export async function criarNota(idUsuario, texto) {
  const { data } = await api.post('/diario', { id_usuario: idUsuario, descricao: texto });
  return adaptarNota(data);
}

export async function atualizarNota(id, texto) {
  const { data } = await api.put('/diario/' + id, { descricao: texto });
  return adaptarNota(data);
}

export async function excluirNota(id) {
  await api.delete('/diario/' + id);
}
