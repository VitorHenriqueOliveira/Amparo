import { criarEstilos } from '../theme/estilos';
import { AreaDaTela, Cabecalho, NavegacaoInferior } from '../components/NavegacaoPadrao';
import { DEGRADES } from '../theme/tema';
import React, { useCallback, useMemo, useState, useContext } from 'react';

import {
    View,
    Text,
    TouchableOpacity,

    ScrollView,
} from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import Svg, { Path, Circle } from 'react-native-svg';

import {
    listarSono,
} from '../storage/registros';
import { listarDiario } from '../services/diario';
import { listarEmocoes } from '../services/emocoes';
import { AuthContext } from '../contexts/AuthContext';

const EMOCOES = {
    feliz: {
        titulo: 'Feliz',
        cor: '#A7D64F',
        icone: 'sunny-outline',
    },
    triste: {
        titulo: 'Triste',
        cor: '#527D28',
        icone: 'rainy-outline',
    },
    neutro: {
        titulo: 'Neutro',
        cor: '#D4E99B',
        icone: 'cloud-outline',
    },
    raiva: {
        titulo: 'Raiva',
        cor: '#31551D',
        icone: 'thunderstorm-outline',
    },
};

const DIAS_SEMANA = [
    'Dom',
    'Seg',
    'Ter',
    'Qua',
    'Qui',
    'Sex',
    'Sáb',
];

const MESES = [
    'Janeiro',
    'Fevereiro',
    'Março',
    'Abril',
    'Maio',
    'Junho',
    'Julho',
    'Agosto',
    'Setembro',
    'Outubro',
    'Novembro',
    'Dezembro',
];

const FILTROS = ['Dia', 'Semana', 'Mês'];

// Navegação padronizada com as demais telas do Amparo.

// Converte datas sem deslocar dias por causa do fuso horário.
function lerData(valor) {
    if (!valor) return null;

    if (valor instanceof Date) {
        if (Number.isNaN(valor.getTime())) return null;
        return new Date(
            valor.getFullYear(),
            valor.getMonth(),
            valor.getDate(),
            12
        );
    }

    if (typeof valor !== 'string') return null;

    const dataISO = valor.match(/^(\d{4})-(\d{2})-(\d{2})$/);

    if (dataISO) {
        return new Date(
            Number(dataISO[1]),
            Number(dataISO[2]) - 1,
            Number(dataISO[3]),
            12
        );
    }

    const dataBR = valor.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);

    if (dataBR) {
        return new Date(
            Number(dataBR[3]),
            Number(dataBR[2]) - 1,
            Number(dataBR[1]),
            12
        );
    }

    const data = new Date(valor);

    if (Number.isNaN(data.getTime())) return null;

    return new Date(
        data.getFullYear(),
        data.getMonth(),
        data.getDate(),
        12
    );
}

function chaveData(valor) {
    const data = lerData(valor);
    if (!data) return null;

    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');

    return `${ano}-${mes}-${dia}`;
}

function chaveDataNota(nota) {
    return chaveData(nota.createdAt || nota.date);
}

function formatarDataCurta(chave) {
    if (!chave) return '';

    const [, mes, dia] = chave.split('-');
    return `${dia}/${mes}`;
}

function calcularMinutosSono(registro) {
    if (Number.isFinite(registro.totalMinutes)) {
        return registro.totalMinutes;
    }

    if (!registro.sleepTime || !registro.wakeTime) {
        return null;
    }

    const [h1, m1] = registro.sleepTime.split(':').map(Number);
    const [h2, m2] = registro.wakeTime.split(':').map(Number);

    let inicio = h1 * 60 + m1;
    let fim = h2 * 60 + m2;

    if (fim <= inicio) fim += 24 * 60;

    return fim - inicio;
}

function formatarDuracao(minutos) {
    if (minutos == null || !Number.isFinite(minutos)) return '—';

    const horas = Math.floor(minutos / 60);
    const resto = minutos % 60;

    return resto > 0 ? `${horas}h ${resto}min` : `${horas}h`;
}

function inicioDoDia(data) {
    const resultado = new Date(data);
    resultado.setHours(0, 0, 0, 0);
    return resultado;
}

function dataDentroDoPeriodo(valor, filtro, hoje) {
    const data = lerData(valor);
    if (!data) return false;

    const dataAtual = inicioDoDia(hoje);
    const diaRegistro = inicioDoDia(data);

    if (filtro === 'Dia') {
        return diaRegistro.getTime() === dataAtual.getTime();
    }

    if (filtro === 'Semana') {
        const inicio = new Date(dataAtual);
        inicio.setDate(inicio.getDate() - 6);

        return diaRegistro >= inicio && diaRegistro <= dataAtual;
    }

    return (
        data.getFullYear() === hoje.getFullYear() &&
        data.getMonth() === hoje.getMonth()
    );
}

function gerarSetor(inicioAngulo, fimAngulo, raio = 86, centro = 100) {
    const rad = (angulo) => (angulo * Math.PI) / 180;

    const x1 = centro + raio * Math.cos(rad(inicioAngulo));
    const y1 = centro + raio * Math.sin(rad(inicioAngulo));
    const x2 = centro + raio * Math.cos(rad(fimAngulo));
    const y2 = centro + raio * Math.sin(rad(fimAngulo));

    const grandeArco = fimAngulo - inicioAngulo > 180 ? 1 : 0;

    return [
        `M ${centro} ${centro}`,
        `L ${x1} ${y1}`,
        `A ${raio} ${raio} 0 ${grandeArco} 1 ${x2} ${y2}`,
        'Z',
    ].join(' ');
}

function GraficoPizza({ contagens, total }) {
    const setores = useMemo(() => {
        if (!total) return [];

        let anguloAtual = -90;

        return Object.entries(EMOCOES)
            .map(([chave, emocao]) => {
                const quantidade = contagens[chave] || 0;

                if (!quantidade) return null;

                const anguloInicial = anguloAtual;
                const anguloFinal = anguloAtual + (quantidade / total) * 360;

                anguloAtual = anguloFinal;

                return {
                    chave,
                    ...emocao,
                    quantidade,
                    percentual: Math.round((quantidade / total) * 100),
                    anguloInicial,
                    anguloFinal,
                };
            })
            .filter(Boolean);
    }, [contagens, total]);

    return (
        <View style={styles.pieArea}>
            <View style={styles.pieWrapper}>
                {total === 0 ? (
                    <View style={styles.pieEmpty}>
                        <Ionicons
                            name="analytics-outline"
                            size={42}
                            color="#6D8D3D"
                        />
                        <Text style={styles.pieEmptyText}>
                            Sem registros neste período
                        </Text>
                    </View>
                ) : (
                    <Svg width={220} height={220} viewBox="0 0 200 200">
                        {setores.length === 1 ? (
                            <Circle
                                cx="100"
                                cy="100"
                                r="86"
                                fill={setores[0].cor}
                            />
                        ) : (
                            setores.map((setor) => (
                                <Path
                                    key={setor.chave}
                                    d={gerarSetor(
                                        setor.anguloInicial,
                                        setor.anguloFinal
                                    )}
                                    fill={setor.cor}
                                    stroke="#F4F9E9"
                                    strokeWidth="1.5"
                                />
                            ))
                        )}
                    </Svg>
                )}
            </View>

            {total > 0 && (
                <View style={styles.legend}>
                    {Object.entries(EMOCOES).map(([chave, emocao]) => {
                        const quantidade = contagens[chave] || 0;
                        const percentual = Math.round((quantidade / total) * 100);

                        return (
                            <View style={styles.legendRow} key={chave}>
                                <View
                                    style={[
                                        styles.legendDot,
                                        { backgroundColor: emocao.cor },
                                    ]}
                                />

                                <Text style={styles.legendName}>
                                    {emocao.titulo}
                                </Text>

                                <Text style={styles.legendValue}>
                                    {quantidade} ({percentual}%)
                                </Text>
                            </View>
                        );
                    })}
                </View>
            )}
        </View>
    );
}

function gerarConselho(contagens, total, mediaSono) {
    if (total === 0) {
        return {
            titulo: 'Comece por você',
            texto:
                'Registre como está se sentindo hoje. Com o tempo, você poderá perceber padrões e descobrir quais cuidados fazem bem para você.',
            icone: 'leaf-outline',
        };
    }

    const ordenadas = Object.entries(contagens)
        .sort((a, b) => b[1] - a[1]);

    const [emocaoPrincipal, quantidadePrincipal] = ordenadas[0];
    const percentualPrincipal = quantidadePrincipal / total;

    if (mediaSono !== null && mediaSono < 6 * 60) {
        return {
            titulo: 'Dê atenção ao seu descanso',
            texto:
                'Seus registros indicam uma média de sono inferior a seis horas neste período. Se puder, reserve um momento para desacelerar e manter uma rotina de descanso. Uma média curta não explica, sozinha, como você está se sentindo.',
            icone: 'moon-outline',
        };
    }

    if (percentualPrincipal >= 0.5 && emocaoPrincipal === 'triste') {
        return {
            titulo: 'Acolha o que você está sentindo',
            texto:
                'A tristeza apareceu com mais frequência nos seus registros. Tente reservar alguns minutos para respirar, escrever no diário ou conversar com alguém de confiança. Você não precisa resolver tudo de uma vez.',
            icone: 'heart-outline',
        };
    }

    if (percentualPrincipal >= 0.5 && emocaoPrincipal === 'raiva') {
        return {
            titulo: 'Faça uma pausa gentil',
            texto:
                'A raiva apareceu com frequência neste período. Quando sentir que precisa, afaste-se por alguns minutos, respire lentamente e volte à situação quando estiver mais confortável.',
            icone: 'leaf-outline',
        };
    }

    if (percentualPrincipal >= 0.5 && emocaoPrincipal === 'feliz') {
        return {
            titulo: 'Valorize o que faz bem',
            texto:
                'A felicidade apareceu com mais frequência nos seus registros. Se quiser, anote no diário o que contribuiu para esses momentos e quais hábitos gostaria de cultivar.',
            icone: 'sunny-outline',
        };
    }

    if (percentualPrincipal >= 0.5 && emocaoPrincipal === 'neutro') {
        return {
            titulo: 'Observe seu ritmo',
            texto:
                'A neutralidade apareceu com frequência. Você pode aproveitar esse momento para fazer uma pausa, observar suas necessidades e escolher uma pequena atividade que lhe traga bem-estar.',
            icone: 'cloud-outline',
        };
    }

    return {
        titulo: 'Continue se observando',
        texto:
            'Seus registros mostram diferentes emoções ao longo do período. Não existe uma emoção que você precise sentir o tempo todo. Continue anotando como se sente e observe o que acontece ao seu redor.',
        icone: 'leaf-outline',
    };
}

export default function GraficoScreen({ navigation }) {
    const { usuario } = useContext(AuthContext);
    const idUsuario = usuario.id_usuario;
    const [dados, setDados] = useState({
        emocoes: [],
        diario: [],
        sono: [],
    });

    const [filtro, setFiltro] = useState('Mês');
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState(false);

    useFocusEffect(
        useCallback(() => {
            let mounted = true;

            async function carregarDados() {
                setCarregando(true);
                setErro(false);

                try {
                    const [emocoes, diario, sono] = await Promise.all([
                        listarEmocoes(),
                        listarDiario(idUsuario),
                        listarSono(idUsuario),
                    ]);

                    if (mounted) {
                        setDados({
                            emocoes: Array.isArray(emocoes) ? emocoes : [],
                            diario: Array.isArray(diario) ? diario : [],
                            sono: Array.isArray(sono) ? sono : [],
                        });
                    }
                } catch (error) {
                    console.error('Erro ao carregar gráfico.');
                    if (mounted) setErro(true);
                } finally {
                    if (mounted) setCarregando(false);
                }
            }

            carregarDados();

            return () => {
                mounted = false;
            };
        }, [idUsuario])
    );

    const hoje = new Date();

    const emocoesPeriodo = useMemo(
        () =>
            dados.emocoes.filter((registro) =>
                dataDentroDoPeriodo(registro.date, filtro, hoje)
            ),
        [dados.emocoes, filtro, hoje.getDate(), hoje.getMonth(), hoje.getFullYear()]
    );

    const diarioPeriodo = useMemo(
        () =>
            dados.diario.filter((nota) =>
                dataDentroDoPeriodo(
                    nota.createdAt || nota.date,
                    filtro,
                    hoje
                )
            ),
        [dados.diario, filtro, hoje.getDate(), hoje.getMonth(), hoje.getFullYear()]
    );

    const sonoPeriodo = useMemo(
        () =>
            dados.sono.filter((registro) =>
                dataDentroDoPeriodo(registro.date, filtro, hoje)
            ),
        [dados.sono, filtro, hoje.getDate(), hoje.getMonth(), hoje.getFullYear()]
    );

    const contagens = useMemo(() => {
        const resultado = {};

        Object.keys(EMOCOES).forEach((chave) => {
            resultado[chave] = emocoesPeriodo.filter(
                (registro) => registro.emotionKey === chave
            ).length;
        });

        return resultado;
    }, [emocoesPeriodo]);

    const totalEmocoes = emocoesPeriodo.length;
    const totalNotas = diarioPeriodo.length;

    const duracoesSono = sonoPeriodo
        .map(calcularMinutosSono)
        .filter((minutos) => minutos !== null && minutos > 0);

    const mediaSono =
        duracoesSono.length > 0
            ? Math.round(
                    duracoesSono.reduce((total, minutos) => total + minutos, 0) /
                        duracoesSono.length
                )
            : null;

    const conselho = useMemo(
        () => gerarConselho(contagens, totalEmocoes, mediaSono),
        [contagens, totalEmocoes, mediaSono]
    );

    const tituloPeriodo =
        filtro === 'Dia'
            ? 'Hoje'
            : filtro === 'Semana'
                ? 'Últimos 7 dias'
                : `Seu mês de ${MESES[hoje.getMonth()]}`;

    const dias = useMemo(() => {
        const dataHoje = new Date();
        dataHoje.setHours(12, 0, 0, 0);

        return Array.from({ length: 7 }, (_, indice) => {
            const data = new Date(dataHoje);
            data.setDate(dataHoje.getDate() - 6 + indice);

            const chave = chaveData(data);

            const emocoesDoDia = dados.emocoes
                .filter((registro) => chaveData(registro.date) === chave)
                .sort((a, b) => {
                    const dataA = new Date(a.createdAt || a.date).getTime();
                    const dataB = new Date(b.createdAt || b.date).getTime();
                    return dataA - dataB;
                });

            const ultimaEmocao =
                emocoesDoDia.length > 0
                    ? emocoesDoDia[emocoesDoDia.length - 1]
                    : null;

            const sonoDoDia =
                dados.sono.find(
                    (registro) => chaveData(registro.date) === chave
                ) || null;

            const quantidadeNotas = dados.diario.filter(
                (nota) => chaveDataNota(nota) === chave
            ).length;

            return {
                chave,
                nomeDia: DIAS_SEMANA[data.getDay()],
                dataCurta: formatarDataCurta(chave),
                emocao: ultimaEmocao,
                sono: sonoDoDia,
                quantidadeNotas,
            };
        });
    }, [dados]);

    return (
        <LinearGradient
            colors={DEGRADES.fundo}
            style={styles.container}
        >
            <AreaDaTela>
                <Cabecalho titulo="Evolução Emocional" navigation={navigation} />

                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    <Text style={styles.introTitle}>Seu panorama</Text>

                    <Text style={styles.introText}>
                        Acompanhe suas emoções, seu descanso e os momentos que
                        você registra no diário.
                    </Text>

                    {erro && (
                        <View style={styles.errorCard}>
                            <Text style={styles.errorText}>
                                Não foi possível carregar os dados. Volte para esta
                                tela e tente novamente.
                            </Text>
                        </View>
                    )}

                    <View style={styles.summaryRow}>
                        <View style={styles.summaryCard}>
                            <Ionicons
                                name="heart-outline"
                                size={23}
                                color="#D5FF73"
                            />
                            <Text style={styles.summaryNumber}>
                                {totalEmocoes}
                            </Text>
                            <Text style={styles.summaryLabel}>
                                Registros emocionais
                            </Text>
                        </View>

                        <View style={styles.summaryCard}>
                            <Ionicons
                                name="moon-outline"
                                size={23}
                                color="#D5FF73"
                            />
                            <Text style={styles.summaryNumber}>
                                {formatarDuracao(mediaSono)}
                            </Text>
                            <Text style={styles.summaryLabel}>
                                Média de sono
                            </Text>
                        </View>

                        <View style={styles.summaryCard}>
                            <Ionicons
                                name="book-outline"
                                size={23}
                                color="#D5FF73"
                            />
                            <Text style={styles.summaryNumber}>
                                {totalNotas}
                            </Text>
                            <Text style={styles.summaryLabel}>
                                Notas no diário
                            </Text>
                        </View>
                    </View>

                    <View style={styles.filterBox}>
                        <View style={styles.filterTitleArea}>
                            <Text style={styles.periodTitle}>
                                {tituloPeriodo}
                            </Text>
                            <Ionicons
                                name="calendar-outline"
                                size={19}
                                color="#D5FF73"
                            />
                        </View>

                        <View style={styles.filterOptions}>
                            {FILTROS.map((opcao) => {
                                const ativo = filtro === opcao;

                                return (
                                    <TouchableOpacity
                                        key={opcao}
                                        onPress={() => setFiltro(opcao)}
                                        activeOpacity={0.8}
                                        style={[
                                            styles.filterButton,
                                            ativo && styles.filterButtonActive,
                                        ]}
                                    >
                                        <Text
                                            style={[
                                                styles.filterButtonText,
                                                ativo && styles.filterButtonTextActive,
                                            ]}
                                        >
                                            {opcao}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>

                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>
                            Suas emoções
                        </Text>

                        <Text style={styles.cardSubtitle}>
                            Distribuição dos registros no período selecionado.
                        </Text>

                        {carregando ? (
                            <Text style={styles.emptyText}>
                                Carregando registros...
                            </Text>
                        ) : (
                            <>
                                <GraficoPizza
                                    contagens={contagens}
                                    total={totalEmocoes}
                                />

                                {totalEmocoes > 0 && (
                                    <View style={styles.totalPill}>
                                        <Text style={styles.totalPillText}>
                                            {totalEmocoes}{' '}
                                            {totalEmocoes === 1
                                                ? 'registro emocional'
                                                : 'registros emocionais'}
                                        </Text>
                                    </View>
                                )}
                            </>
                        )}
                    </View>

                    <View style={styles.adviceCard}>
                        <View style={styles.adviceIcon}>
                            <Ionicons
                                name={conselho.icone}
                                size={27}
                                color="#31551D"
                            />
                        </View>

                        <View style={styles.adviceContent}>
                            <Text style={styles.adviceTitle}>
                                {conselho.titulo}
                            </Text>

                            <Text style={styles.adviceText}>
                                {conselho.texto}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>
                            Linha do tempo
                        </Text>

                        <Text style={styles.cardSubtitle}>
                            Veja a última emoção registrada em cada dia, o sono
                            informado e a atividade no diário.
                        </Text>

                        {carregando ? (
                            <Text style={styles.emptyText}>
                                Carregando histórico...
                            </Text>
                        ) : (
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.timelineContainer}
                            >
                                {dias.map((dia) => {
                                    const emocao =
                                        dia.emocao &&
                                        EMOCOES[dia.emocao.emotionKey]
                                            ? EMOCOES[dia.emocao.emotionKey]
                                            : null;

                                    const minutos = dia.sono
                                        ? calcularMinutosSono(dia.sono)
                                        : null;

                                    return (
                                        <View
                                            style={styles.dayCard}
                                            key={dia.chave}
                                        >
                                            <Text style={styles.dayName}>
                                                {dia.nomeDia}
                                            </Text>

                                            <Text style={styles.dayDate}>
                                                {dia.dataCurta}
                                            </Text>

                                            <View
                                                style={[
                                                    styles.dayEmotionCircle,
                                                    {
                                                        backgroundColor: emocao
                                                            ? `${emocao.cor}35`
                                                            : 'rgba(255,255,255,0.06)',
                                                        borderColor: emocao
                                                            ? emocao.cor
                                                            : 'rgba(255,255,255,0.16)',
                                                    },
                                                ]}
                                            >
                                                <Ionicons
                                                    name={
                                                        emocao
                                                            ? emocao.icone
                                                            : 'remove-outline'
                                                    }
                                                    size={24}
                                                    color={emocao ? emocao.cor : '#A2B68C'}
                                                />
                                            </View>

                                            <Text
                                                style={styles.dayEmotionTitle}
                                                numberOfLines={2}
                                            >
                                                {emocao ? emocao.titulo : 'Sem registro'}
                                            </Text>

                                            <View style={styles.dayDetail}>
                                                <Ionicons
                                                    name="moon-outline"
                                                    size={14}
                                                    color="#D5FF73"
                                                />
                                                <Text style={styles.dayDetailText}>
                                                    {formatarDuracao(minutos)}
                                                </Text>
                                            </View>

                                            <View style={styles.dayDetail}>
                                                <Ionicons
                                                    name="book-outline"
                                                    size={14}
                                                    color="#D5FF73"
                                                />
                                                <Text style={styles.dayDetailText}>
                                                    {dia.quantidadeNotas} nota(s)
                                                </Text>
                                            </View>
                                        </View>
                                    );
                                })}
                            </ScrollView>
                        )}
                    </View>

                    <Text style={styles.disclaimer}>
                        Seus registros ajudam na auto-observação, mas não são
                        um diagnóstico nem uma medida clínica da saúde mental.
                    </Text>
                </ScrollView>

                {/* Navegação inferior padronizada */}
                <NavegacaoInferior navigation={navigation} ativa="Grafico" />
            </AreaDaTela>
        </LinearGradient>
    );
}

const styles = criarEstilos({
    container: {
        flex: 1,
    },

    scrollContent: {
        paddingHorizontal: 16,
        paddingBottom: 24,
    },

    introTitle: {
        fontSize: 23,
        fontWeight: '900',
        color: '#1D3507',
        marginTop: 4,
        marginBottom: 5,
    },

    introText: {
        fontSize: 13,
        lineHeight: 19,
        color: '#304B17',
        marginBottom: 16,
    },

    summaryRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 16,
    },

    summaryCard: {
        flex: 1,
        minHeight: 112,
        borderRadius: 18,
        backgroundColor: '#254508',
        paddingVertical: 12,
        paddingHorizontal: 7,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.14)',
    },

    summaryNumber: {
        color: '#FFF',
        fontSize: 19,
        fontWeight: '900',
        marginTop: 7,
        marginBottom: 3,
        textAlign: 'center',
    },

    summaryLabel: {
        color: '#E0F0C0',
        fontSize: 10,
        lineHeight: 14,
        textAlign: 'center',
    },

    filterBox: {
        backgroundColor: '#162802',
        borderRadius: 24,
        padding: 13,
        marginBottom: 16,
    },

    filterTitleArea: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        paddingHorizontal: 5,
    },

    periodTitle: {
        color: '#D5FF73',
        fontSize: 17,
        fontWeight: '800',
    },

    filterOptions: {
        flexDirection: 'row',
        gap: 7,
    },

    filterButton: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 9,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: 'rgba(213,255,115,0.35)',
    },

    filterButtonActive: {
        backgroundColor: '#C8FF00',
        borderColor: '#C8FF00',
    },

    filterButtonText: {
        color: '#E0F0C0',
        fontSize: 13,
        fontWeight: '700',
    },

    filterButtonTextActive: {
        color: '#162704',
    },

    card: {
        backgroundColor: '#203B07',
        borderRadius: 23,
        padding: 17,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.14)',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.18,
        shadowRadius: 5,
    },

    cardTitle: {
        color: '#D5FF73',
        fontSize: 18,
        fontWeight: '900',
        marginBottom: 5,
    },

    cardSubtitle: {
        color: 'rgba(255,255,255,0.72)',
        fontSize: 12,
        lineHeight: 18,
        marginBottom: 14,
    },

    pieArea: {
        alignItems: 'center',
    },

    pieWrapper: {
        width: 230,
        height: 230,
        alignItems: 'center',
        justifyContent: 'center',
    },

    pieEmpty: {
        width: 200,
        height: 200,
        borderRadius: 100,
        borderWidth: 2,
        borderColor: '#6D8D3D',
        backgroundColor: 'rgba(255,255,255,0.04)',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 25,
    },

    pieEmptyText: {
        color: '#E0F0C0',
        fontSize: 12,
        textAlign: 'center',
        marginTop: 10,
        lineHeight: 17,
    },

    legend: {
        width: '100%',
        marginTop: 5,
        gap: 11,
    },

    legendRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },

    legendDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginRight: 9,
    },

    legendName: {
        flex: 1,
        color: '#FFF',
        fontSize: 13,
        fontWeight: '600',
    },

    legendValue: {
        color: '#E0F0C0',
        fontSize: 12,
        fontWeight: '700',
    },

    totalPill: {
        alignSelf: 'center',
        backgroundColor: 'rgba(213,255,115,0.13)',
        borderRadius: 20,
        paddingHorizontal: 14,
        paddingVertical: 8,
        marginTop: 16,
    },

    totalPillText: {
        color: '#D5FF73',
        fontSize: 12,
        fontWeight: '800',
    },

    adviceCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: '#8FBF53',
        borderRadius: 20,
        padding: 15,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.55)',
    },

    adviceIcon: {
        width: 43,
        height: 43,
        borderRadius: 22,
        backgroundColor: '#E6F5C6',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },

    adviceContent: {
        flex: 1,
    },

    adviceTitle: {
        color: '#183507',
        fontSize: 15,
        fontWeight: '900',
        marginBottom: 6,
    },

    adviceText: {
        color: '#203B12',
        fontSize: 12,
        lineHeight: 18,
    },

    emptyText: {
        color: '#FFF',
        textAlign: 'center',
        fontSize: 13,
        lineHeight: 19,
        marginVertical: 12,
    },

    timelineContainer: {
        paddingRight: 4,
        gap: 10,
    },

    dayCard: {
        width: 116,
        minHeight: 174,
        paddingVertical: 12,
        paddingHorizontal: 8,
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderRadius: 17,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
    },

    dayName: {
        fontSize: 13,
        fontWeight: '900',
        color: '#D5FF73',
    },

    dayDate: {
        fontSize: 11,
        color: 'rgba(255,255,255,0.65)',
        marginTop: 2,
        marginBottom: 10,
    },

    dayEmotionCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 1.5,
        justifyContent: 'center',
        alignItems: 'center',
    },

    dayEmotionTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: '#FFF',
        marginTop: 7,
        marginBottom: 12,
        textAlign: 'center',
        minHeight: 30,
    },

    dayDetail: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 5,
        gap: 4,
    },

    dayDetailText: {
        fontSize: 10,
        color: '#E0F0C0',
    },

    disclaimer: {
        color: '#304B17',
        fontSize: 11,
        lineHeight: 16,
        textAlign: 'center',
        paddingHorizontal: 8,
        marginBottom: 8,
    },

    errorCard: {
        backgroundColor: '#FFF1F0',
        padding: 12,
        borderRadius: 12,
        marginBottom: 12,
    },

    errorText: {
        color: '#922B21',
        fontSize: 13,
    },

});