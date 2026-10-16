function diaValido(valor) {
    if (typeof valor !== 'string' || !/^[1-9]\d{3}-\d{2}-\d{2}$/.test(valor)) return false;

    const data = new Date(valor + 'T00:00:00Z');

    return Number.isFinite(data.getTime()) && data.toISOString().slice(0, 10) === valor;
}

function fusoValido(valor) {
    if (typeof valor !== 'string' || valor.length > 100 || /^[+-]/.test(valor)) return false;

    try {
        new Intl.DateTimeFormat('en', { timeZone: valor });

        return true;
    } catch {
        return false;
    }
}

export function periodoValido(inicio, fim, fuso) {
    const dias = (Date.parse(fim) - Date.parse(inicio)) / 86400000;

    return diaValido(inicio) && diaValido(fim) && fusoValido(fuso) && dias >= 0 && dias <= 365;
}
