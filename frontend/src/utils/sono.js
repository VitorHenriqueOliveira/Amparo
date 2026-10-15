export function horarioValido(valor) {
    return typeof valor === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(valor);
}

export function calcularDuracao(inicio, fim) {
    if (!horarioValido(inicio) || !horarioValido(fim) || inicio === fim) return null;
    const minutos = (valor) => Number(valor.slice(0, 2)) * 60 + Number(valor.slice(3));
    return (minutos(fim) - minutos(inicio) + 1440) % 1440;
}

export function formatarDuracao(minutos) {
    if (!Number.isInteger(minutos) || minutos < 0) return '—';
    const horas = Math.floor(minutos / 60);
    const resto = minutos % 60;
    return resto ? horas + 'h ' + String(resto).padStart(2, '0') + 'min' : horas + 'h';
}

export function metaValida(min, max) {
    return Number.isInteger(min) && Number.isInteger(max) && min >= 1 && max <= 24 && min <= max;
}

export function avaliarMeta(minutos, min, max) {
    if (minutos === null || !metaValida(min, max)) {
        return { texto: 'Aguardando seu registro', icone: 'moon-outline', cor: '#DDE8C5', progresso: 0 };
    }
    const progresso = Math.min(100, Math.floor(minutos / (min * 60) * 100));
    if (minutos < min * 60) return { texto: 'Abaixo da sua meta', icone: 'moon-outline', cor: '#FFE3AC', progresso };
    if (minutos > max * 60) return { texto: 'Acima da sua faixa', icone: 'time-outline', cor: '#FFE3AC', progresso };
    return { texto: 'Meta alcançada', icone: 'checkmark-circle-outline', cor: '#D6FF72', progresso };
}
