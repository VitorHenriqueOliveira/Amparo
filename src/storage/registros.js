import AsyncStorage from '@react-native-async-storage/async-storage';

const CHAVES = {
  emocoes: '@amparo/emocoes',
  diario: '@amparo/diario',
  sono: '@amparo/sono',
  sonoAntigo: '@amparo:registros_sono',
};

const gerarId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

async function lerLista(chave) {
  const conteudo = await AsyncStorage.getItem(chave);

  if (!conteudo) return [];

  const dados = JSON.parse(conteudo);

  return Array.isArray(dados) ? dados : [];
}

async function guardarLista(chave, dados) {
  await AsyncStorage.setItem(chave, JSON.stringify(dados));
}

// EMOÇÕES

export function listarEmocoes() {
  return lerLista(CHAVES.emocoes);
}

export async function adicionarEmocao(emotionKey, emotionTitle) {
  const registros = await lerLista(CHAVES.emocoes);

  const novoRegistro = {
    id: gerarId(),
    emotionKey,
    emotionTitle,
    date: new Date().toISOString(),
  };

  await guardarLista(CHAVES.emocoes, [
    ...registros,
    novoRegistro,
  ]);

  return novoRegistro;
}

// DIÁRIO

export function listarDiario() {
  return lerLista(CHAVES.diario);
}

export function salvarDiario(registros) {
  return guardarLista(CHAVES.diario, registros);
}

// SONO

export async function listarSono() {
  const [registrosNovos, registrosAntigos] = await Promise.all([
    lerLista(CHAVES.sono),
    lerLista(CHAVES.sonoAntigo),
  ]);

  // Junta os históricos e mantém apenas um registro por dia.
  const porData = new Map();

  registrosAntigos.forEach((registro) => {
    if (registro.date) {
      porData.set(registro.date, registro);
    }
  });

  registrosNovos.forEach((registro) => {
    if (registro.date) {
      porData.set(registro.date, registro);
    }
  });

  return Array.from(porData.values()).map((registro) => {
    const totalMinutes =
      Number.isFinite(registro.totalMinutes)
        ? registro.totalMinutes
        : Number.isFinite(registro.durationMinutes)
          ? registro.durationMinutes
          : calcularMinutosSono(
              registro.sleepTime,
              registro.wakeTime
            );

    return {
      ...registro,
      totalMinutes,
    };
  });
}

function obterDataLocal() {
  const hoje = new Date();

  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, '0');
  const dia = String(hoje.getDate()).padStart(2, '0');

  return `${ano}-${mes}-${dia}`;
}

function calcularMinutosSono(horarioDormir, horarioAcordar) {
  if (!horarioDormir || !horarioAcordar) {
    return null;
  }

  const [horasDormir, minutosDormir] =
    horarioDormir.split(':').map(Number);

  const [horasAcordar, minutosAcordar] =
    horarioAcordar.split(':').map(Number);

  let inicio = horasDormir * 60 + minutosDormir;
  let fim = horasAcordar * 60 + minutosAcordar;

  if (fim <= inicio) {
    fim += 24 * 60;
  }

  return fim - inicio;
}

export async function registrarSonoHoje(sleepTime, wakeTime) {
  const registros = await listarSono();
  const data = obterDataLocal();

  const registroExistente = registros.find(
    (registro) => registro.date === data
  );

  const novoRegistro = {
    id: registroExistente?.id ?? gerarId(),
    date: data,
    sleepTime,
    wakeTime,
    totalMinutes: calcularMinutosSono(sleepTime, wakeTime),
  };

  const atualizados = [
    ...registros.filter((registro) => registro.date !== data),
    novoRegistro,
  ];

  await guardarLista(CHAVES.sono, atualizados);

  return novoRegistro;
}