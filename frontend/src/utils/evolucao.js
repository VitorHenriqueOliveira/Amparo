const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

export function chaveData(data) {
    return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`;
}

export function obterPeriodo(filtro, referencia, hoje = new Date()) {
    const inicio = new Date(referencia.getFullYear(), referencia.getMonth(), referencia.getDate(), 12);
    const fim = new Date(inicio);
    if (filtro === 'Semana') {
        const diasDesdeSegunda = (inicio.getDay() + 6) % 7;

        inicio.setDate(inicio.getDate() - diasDesdeSegunda);
        fim.setTime(inicio.getTime());
        fim.setDate(fim.getDate() + 6);
    }
    if (filtro === 'Mês') {
        inicio.setDate(1);
        fim.setMonth(fim.getMonth() + 1, 0);
    }
    const titulo = filtro === 'Mês'
        ? `Seu mês de ${MESES[inicio.getMonth()]} de ${inicio.getFullYear()}`
        : filtro === 'Dia' ? (chaveData(inicio) === chaveData(hoje) ? 'Hoje' : inicio.toLocaleDateString('pt-BR'))
            : `${inicio.toLocaleDateString('pt-BR')} a ${fim.toLocaleDateString('pt-BR')}`;
    const intervalo = filtro === 'Dia' ? `Dia ${inicio.toLocaleDateString('pt-BR')}`
        : `${inicio.toLocaleDateString('pt-BR')} a ${fim.toLocaleDateString('pt-BR')}`;

    return { inicio: chaveData(inicio), fim: chaveData(fim), titulo, intervalo };
}

export function moverPeriodo(filtro, referencia, direcao) {
    const data = new Date(referencia.getFullYear(), referencia.getMonth(), referencia.getDate(), 12);
    if (filtro === 'Mês') {
        data.setDate(1);
        data.setMonth(data.getMonth() + direcao);
    } else {
        data.setDate(data.getDate() + direcao * (filtro === 'Semana' ? 7 : 1));
    }
    return data;
}

export function nomeDia(chave) {
    return ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][new Date(chave + 'T12:00:00').getDay()];
}
