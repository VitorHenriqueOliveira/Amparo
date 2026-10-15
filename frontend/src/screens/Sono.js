import { AreaDaTela, Cabecalho, NavegacaoInferior } from '../components/NavegacaoPadrao';
import { CORES, DEGRADES } from '../theme/tema';
import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
    AccessibilityInfo,
    ActivityIndicator,
    AppState,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../contexts/AuthContext';
import SeletorHorario from '../components/SeletorHorario';
import { atualizarMetaSono, buscarSono, registrarSonoHoje } from '../services/sono';
import { avaliarMeta, calcularDuracao, formatarDuracao } from '../utils/sono';
function dataCurta(dia) {
    return dia ? dia.split('-').reverse().join('/') : '';
}
function Botao({ children, onPress, disabled, secundario, label }) {
    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityState={{
                disabled: !!disabled,
            }}
            style={[styles.botao, secundario && styles.botaoSecundario, disabled && styles.desabilitado]}
        >
            <Text style={[styles.botaoTexto, secundario && styles.botaoTextoSecundario]}>{children}</Text>
        </TouchableOpacity>
    );
}
function AjusteMeta({ titulo, valor, onChange, minimo, maximo, disabled }) {
    return (
        <View style={styles.ajusteMeta}>
            <Text style={styles.labelEscuro}>{titulo}</Text>
            <View style={styles.ajusteControles}>
                <TouchableOpacity
                    style={styles.ajusteBotao}
                    onPress={() => onChange(valor - 1)}
                    disabled={disabled || valor <= minimo}
                    accessibilityRole="button"
                    accessibilityLabel={'Diminuir ' + titulo.toLowerCase()}
                    accessibilityState={{
                        disabled: disabled || valor <= minimo,
                    }}
                >
                    <Ionicons name="remove" size={22} color={valor <= minimo ? '#B3BDA7' : '#29491A'} />
                </TouchableOpacity>
                <Text style={styles.ajusteValor} accessibilityLiveRegion="polite">
                    {valor}h
                </Text>
                <TouchableOpacity
                    style={styles.ajusteBotao}
                    onPress={() => onChange(valor + 1)}
                    disabled={disabled || valor >= maximo}
                    accessibilityRole="button"
                    accessibilityLabel={'Aumentar ' + titulo.toLowerCase()}
                    accessibilityState={{
                        disabled: disabled || valor >= maximo,
                    }}
                >
                    <Ionicons name="add" size={22} color={valor >= maximo ? '#B3BDA7' : '#29491A'} />
                </TouchableOpacity>
            </View>
        </View>
    );
}
export default function SonoScreen({ navigation }) {
    const { usuario } = useContext(AuthContext);
    const [dados, setDados] = useState(null);
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState('');
    const [modal, setModal] = useState('horarios');
    const [modalAberto, setModalAberto] = useState(false);
    const [inicio, setInicio] = useState('');
    const [fim, setFim] = useState('');
    const [diaEdicao, setDiaEdicao] = useState('');
    const [min, setMin] = useState(7);
    const [max, setMax] = useState(8);
    const [erroForm, setErroForm] = useState('');
    const [salvando, setSalvando] = useState(false);
    const [mensagem, setMensagem] = useState('');
    const vivo = useRef(true);
    const gravando = useRef(false);
    const versao = useRef(0);
    useEffect(() => {
        vivo.current = true;
        return () => {
            vivo.current = false;
            versao.current++;
        };
    }, [usuario.id_usuario]);
    const carregar = useCallback(async () => {
        if (gravando.current) return;
        const consulta = ++versao.current;
        try {
            const resposta = await buscarSono();
            if (vivo.current && consulta === versao.current) {
                setDados(resposta);
                setErro('');
            }
        } catch {
            if (vivo.current && consulta === versao.current) {
                setErro('Não foi possível carregar seu sono. Verifique a conexão e tente novamente.');
            }
        } finally {
            if (vivo.current && consulta === versao.current) setCarregando(false);
        }
    }, [usuario.id_usuario]);
    useFocusEffect(
        useCallback(() => {
            carregar();
            const listener = AppState.addEventListener('change', (estado) => {
                if (estado === 'active') carregar();
            });
            return () => listener.remove();
        }, [carregar])
    );
    useEffect(() => {
        if (!dados) return;
        let timer;
        const atualizarDia = () => {
            if (gravando.current) timer = setTimeout(atualizarDia, 1000);
            else carregar();
        };
        timer = setTimeout(atualizarDia, dados.atualizarEm + 1000);
        return () => clearTimeout(timer);
    }, [dados?.atualizarEm, carregar]);
    useEffect(() => {
        if (!mensagem) return;
        AccessibilityInfo.announceForAccessibility(mensagem);
        const timer = setTimeout(() => setMensagem(''), 3000);
        return () => clearTimeout(timer);
    }, [mensagem]);
    const registro = dados?.registro;
    const duracao = registro?.totalMinutes ?? null;
    const status = avaliarMeta(duracao, dados?.meta.min, dados?.meta.max);
    const previa = calcularDuracao(inicio, fim);
    const abrir = (tipo) => {
        if (!dados || erro || gravando.current) return;
        setErroForm('');
        setMensagem('');
        setInicio(registro?.sleepTime || '');
        setFim(registro?.wakeTime || '');
        setDiaEdicao(dados.hoje);
        setMin(dados.meta.min);
        setMax(dados.meta.max);
        setModal(tipo);
        setModalAberto(true);
    };
    const fecharModal = () => {
        if (!gravando.current) setModalAberto(false);
    };
    const salvar = async () => {
        if (gravando.current || !modalAberto) return;
        if (modal === 'horarios' && diaEdicao !== dados.hoje) {
            setDiaEdicao(dados.hoje);
            setErroForm('O dia mudou. Confira a nova data e salve novamente.');
            return;
        }
        gravando.current = true;
        ++versao.current;
        setSalvando(true);
        setErroForm('');
        try {
            if (modal === 'horarios') {
                const salvo = await registrarSonoHoje(inicio, fim, diaEdicao);
                if (!vivo.current) return;
                setDados((anterior) => ({
                    ...anterior,
                    registro: salvo,
                }));
                setMensagem('Horários salvos');
            } else {
                const meta = await atualizarMetaSono(min, max);
                if (!vivo.current) return;
                setDados((anterior) => ({
                    ...anterior,
                    meta,
                }));
                setMensagem('Meta atualizada');
            }
            setErro('');
            setModalAberto(false);
        } catch (falha) {
            if (!vivo.current) return;
            if (falha.response?.data?.codigo === 'DIA_ALTERADO') {
                try {
                    const atual = await buscarSono();
                    if (!vivo.current) return;
                    setDados(atual);
                    setDiaEdicao(atual.hoje);
                    setErro('');
                    setErroForm('O dia mudou. Confira a nova data e salve novamente.');
                } catch {
                    if (vivo.current) {
                        setErro('Não foi possível atualizar a data. Verifique a conexão e tente novamente.');
                        setErroForm(
                            'O dia mudou e não foi possível atualizar a data. Feche e tente carregar novamente.'
                        );
                    }
                }
            } else {
                setErroForm('Não foi possível salvar. Seus ajustes continuam aqui para tentar novamente.');
            }
        } finally {
            gravando.current = false;
            if (vivo.current) setSalvando(false);
        }
    };
    return (
        <LinearGradient colors={DEGRADES.fundo} style={styles.container}>
            <AreaDaTela>
                <View style={styles.limite}>
                    <Cabecalho titulo="Sono" navigation={navigation} />
                    <ScrollView
                        style={styles.conteudo}
                        contentContainerStyle={styles.conteudoInterno}
                        showsVerticalScrollIndicator={false}
                    >
                        {carregando ? (
                            <View style={styles.estado}>
                                <ActivityIndicator size="large" color="#29491A" />
                                <Text style={styles.estadoTexto}>Carregando seu sono...</Text>
                            </View>
                        ) : erro ? (
                            <View style={styles.estado}>
                                <Ionicons name="cloud-offline-outline" size={42} color="#42622B" />
                                <Text style={styles.estadoTitulo}>Vamos tentar de novo?</Text>
                                <Text style={styles.estadoTexto} accessibilityRole="alert">
                                    {erro}
                                </Text>
                                <Botao
                                    onPress={() => {
                                        setCarregando(true);
                                        carregar();
                                    }}
                                >
                                    Tentar novamente
                                </Botao>
                            </View>
                        ) : (
                            dados && (
                                <>
                                    <LinearGradient colors={DEGRADES.cartao} style={styles.hero}>
                                        <View style={styles.heroTopo}>
                                            <View>
                                                <Text style={styles.sobrancelha}>SEU DESCANSO</Text>
                                                <Text style={styles.data}>
                                                    Hoje · {dataCurta(dados.hoje)}
                                                </Text>
                                            </View>
                                            <View style={styles.lua}>
                                                <Ionicons name="moon" size={56} color={CORES.acento} />
                                            </View>
                                        </View>
                                        <Text style={[styles.duracao, !registro && styles.duracaoVazia]}>
                                            {registro ? formatarDuracao(duracao) : 'Como foi sua noite?'}
                                        </Text>
                                        <Text style={styles.heroSub}>
                                            {registro
                                                ? 'Tempo entre dormir e acordar'
                                                : 'Registre seus horários para acompanhar seu sono.'}
                                        </Text>
                                        <View
                                            style={[
                                                styles.status,
                                                {
                                                    backgroundColor: status.cor,
                                                },
                                            ]}
                                        >
                                            <Ionicons name={status.icone} size={17} color="#29451E" />
                                            <Text style={styles.statusTexto}>{status.texto}</Text>
                                        </View>
                                        {mensagem ? (
                                            <View style={styles.confirmacao} accessibilityLiveRegion="polite">
                                                <Ionicons
                                                    name="checkmark-circle"
                                                    size={18}
                                                    color={CORES.acento}
                                                />
                                                <Text style={styles.confirmacaoTexto}>{mensagem}</Text>
                                            </View>
                                        ) : null}
                                    </LinearGradient>

                                    <View style={styles.secaoTitulo}>
                                        <Text style={styles.titulo}>Seus horários</Text>
                                        <TouchableOpacity
                                            onPress={() => abrir('horarios')}
                                            style={styles.linkBotao}
                                            accessibilityRole="button"
                                            accessibilityLabel="Editar horários de sono"
                                        >
                                            <Ionicons name="create-outline" size={17} color="#29491A" />
                                            <Text style={styles.linkTexto}>
                                                {registro ? 'Editar' : 'Registrar'}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                    <View style={styles.horarios}>
                                        {[
                                            ['moon-outline', 'Fui dormir às', registro?.sleepTime],
                                            ['sunny-outline', 'Acordei às', registro?.wakeTime],
                                        ].map(([icone, label, valor], indice) => (
                                            <TouchableOpacity
                                                key={label}
                                                onPress={() => abrir('horarios')}
                                                style={styles.horarioToque}
                                                accessibilityRole="button"
                                                accessibilityLabel={
                                                    label +
                                                    ' ' +
                                                    (valor || 'não registrado') +
                                                    '. Editar horários'
                                                }
                                            >
                                                <LinearGradient
                                                    colors={
                                                        indice === 0
                                                            ? DEGRADES.cartaoProfundo
                                                            : DEGRADES.cartaoMedio
                                                    }
                                                    style={styles.horarioCard}
                                                >
                                                    <Ionicons
                                                        name={icone}
                                                        size={25}
                                                        color={indice === 0 ? CORES.icone : '#FFD83D'}
                                                    />
                                                    <Text style={styles.horarioLabel}>{label}</Text>
                                                    <Text style={styles.horarioValor}>
                                                        {valor || '— : —'}
                                                    </Text>
                                                </LinearGradient>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                    {!registro && (
                                        <Botao onPress={() => abrir('horarios')}>Registrar minha noite</Botao>
                                    )}

                                    <LinearGradient colors={DEGRADES.cartaoProfundo} style={styles.metaCard}>
                                        <View style={styles.metaTopo}>
                                            <View style={styles.metaTituloGrupo}>
                                                <Ionicons
                                                    name="flag-outline"
                                                    size={21}
                                                    color={CORES.acento}
                                                />
                                                <Text style={[styles.titulo, styles.tituloNoCartao]}>
                                                    Sua meta diária
                                                </Text>
                                            </View>
                                            <TouchableOpacity
                                                onPress={() => abrir('meta')}
                                                style={styles.linkBotao}
                                                accessibilityRole="button"
                                                accessibilityLabel="Ajustar meta de sono"
                                            >
                                                <Text style={[styles.linkTexto, styles.linkTextoNoCartao]}>
                                                    Ajustar
                                                </Text>
                                                <Ionicons
                                                    name="chevron-forward"
                                                    size={16}
                                                    color={CORES.acento}
                                                />
                                            </TouchableOpacity>
                                        </View>
                                        <Text style={styles.metaValor}>
                                            {dados.meta.min === dados.meta.max
                                                ? dados.meta.min + ' horas'
                                                : dados.meta.min + ' a ' + dados.meta.max + ' horas'}
                                        </Text>
                                        <View
                                            style={styles.barra}
                                            accessibilityRole="progressbar"
                                            accessibilityLabel="Progresso da meta mínima de sono"
                                            aria-valuemin={0}
                                            aria-valuemax={100}
                                            aria-valuenow={status.progresso}
                                            aria-valuetext={status.progresso + '% da meta mínima de sono'}
                                        >
                                            <View
                                                style={[
                                                    styles.barraPreenchida,
                                                    {
                                                        width: status.progresso + '%',
                                                    },
                                                ]}
                                            />
                                        </View>
                                        <View style={styles.metaRodape}>
                                            <Text style={styles.metaLegenda}>
                                                {status.progresso}% da meta mínima
                                            </Text>
                                            <Text style={styles.metaLegenda}>{dados.meta.min}h</Text>
                                        </View>
                                        <Text style={styles.nota}>
                                            Acompanhe seu ritmo, uma noite de cada vez.
                                        </Text>
                                    </LinearGradient>
                                </>
                            )
                        )}
                    </ScrollView>
                    <NavegacaoInferior navigation={navigation} ativa="Sono" />
                </View>
                <Modal visible={modalAberto} transparent animationType="slide" onRequestClose={fecharModal}>
                    <View style={styles.fundoModal}>
                        <View style={styles.modal} accessibilityViewIsModal>
                            <ScrollView
                                contentContainerStyle={styles.modalConteudo}
                                keyboardShouldPersistTaps="handled"
                            >
                                <View style={styles.modalTopo}>
                                    <View style={styles.modalIcone}>
                                        <Ionicons
                                            name={modal === 'meta' ? 'flag-outline' : 'moon-outline'}
                                            size={23}
                                            color="#3B6124"
                                        />
                                    </View>
                                    <TouchableOpacity
                                        onPress={fecharModal}
                                        disabled={salvando}
                                        style={styles.fechar}
                                        accessibilityRole="button"
                                        accessibilityLabel="Fechar edição"
                                    >
                                        <Ionicons name="close" size={24} color="#4B6042" />
                                    </TouchableOpacity>
                                </View>
                                <Text style={styles.modalTitulo}>
                                    {modal === 'meta' ? 'Uma meta para você' : 'Como foi sua noite?'}
                                </Text>
                                <Text style={styles.modalDescricao}>
                                    {modal === 'meta'
                                        ? 'Escolha a faixa de horas que deseja acompanhar todos os dias.'
                                        : 'Registro de ' +
                                          dataCurta(diaEdicao) +
                                          '. Informe quando dormiu e acordou.'}
                                </Text>
                                {modal === 'horarios' ? (
                                    <>
                                        <SeletorHorario
                                            label="Fui dormir às"
                                            value={inicio}
                                            onChange={setInicio}
                                            disabled={salvando}
                                        />
                                        <SeletorHorario
                                            label="Acordei às"
                                            value={fim}
                                            onChange={setFim}
                                            disabled={salvando}
                                        />
                                        <View style={styles.previa}>
                                            <Ionicons name="time-outline" size={22} color="#456332" />
                                            <View style={styles.previaTexto}>
                                                <Text style={styles.labelEscuro}>Tempo de sono</Text>
                                                <Text style={styles.previaValor}>
                                                    {formatarDuracao(previa)}
                                                </Text>
                                            </View>
                                        </View>
                                        <Text style={styles.modalAjuda}>
                                            {inicio && fim && inicio === fim
                                                ? 'Escolha horários diferentes para calcular a duração.'
                                                : 'Se acordou em um horário anterior ao de dormir, contamos a passagem da meia-noite.'}
                                        </Text>
                                    </>
                                ) : (
                                    <>
                                        <AjusteMeta
                                            titulo="Mínimo"
                                            valor={min}
                                            onChange={setMin}
                                            minimo={1}
                                            maximo={max}
                                            disabled={salvando}
                                        />
                                        <AjusteMeta
                                            titulo="Máximo"
                                            valor={max}
                                            onChange={setMax}
                                            minimo={min}
                                            maximo={24}
                                            disabled={salvando}
                                        />
                                        <Text style={styles.modalAjuda}>
                                            O progresso usa o mínimo da sua faixa. A meta fica salva na sua
                                            conta.
                                        </Text>
                                    </>
                                )}
                                {erroForm ? (
                                    <Text style={styles.erroForm} accessibilityRole="alert">
                                        {erroForm}
                                    </Text>
                                ) : null}
                                <Botao
                                    onPress={salvar}
                                    disabled={salvando || (modal === 'horarios' && previa === null)}
                                >
                                    {salvando
                                        ? 'Salvando...'
                                        : modal === 'meta'
                                          ? 'Salvar meta'
                                          : 'Salvar horários'}
                                </Botao>
                                <Botao secundario onPress={fecharModal} disabled={salvando}>
                                    Cancelar
                                </Botao>
                            </ScrollView>
                        </View>
                    </View>
                </Modal>
            </AreaDaTela>
        </LinearGradient>
    );
}
const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    limite: {
        flex: 1,
        minHeight: 0,
    },
    conteudo: {
        flex: 1,
        minHeight: 0,
        paddingHorizontal: 16,
    },
    conteudoInterno: {
        paddingBottom: 12,
        gap: 16,
    },
    hero: {
        borderRadius: 30,
        padding: 24,
        paddingBottom: 27,
    },
    heroTopo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 12,
    },
    sobrancelha: {
        color: '#C6DCAD',
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 2,
    },
    data: {
        color: '#E1EED1',
        fontSize: 13,
        marginTop: 7,
    },
    lua: {
        width: 88,
        height: 88,
        borderRadius: 28,
        backgroundColor: CORES.acento + '1A',
        borderWidth: 1,
        borderColor: CORES.acento + '33',
        alignItems: 'center',
        justifyContent: 'center',
    },
    duracao: {
        color: '#F4F8E9',
        fontSize: 52,
        fontWeight: '700',
        marginTop: 16,
        letterSpacing: -1,
    },
    duracaoVazia: {
        fontSize: 29,
        letterSpacing: -0.5,
    },
    heroSub: {
        color: '#D0DDBF',
        fontSize: 14,
        lineHeight: 21,
        marginTop: 5,
    },
    status: {
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        marginTop: 21,
    },
    statusTexto: {
        color: '#29451E',
        fontSize: 12,
        fontWeight: '700',
        flexShrink: 1,
    },
    confirmacao: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7,
        marginTop: 15,
    },
    confirmacaoTexto: {
        color: '#EDFFD7',
        fontSize: 13,
    },
    secaoTitulo: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 4,
    },
    titulo: {
        color: '#293F1B',
        fontSize: 17,
        fontWeight: '700',
        flexShrink: 1,
    },
    tituloNoCartao: {
        color: '#F4F8E9',
    },
    linkBotao: {
        minHeight: 44,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 5,
    },
    linkTexto: {
        color: '#29491A',
        fontSize: 13,
        fontWeight: '700',
    },
    linkTextoNoCartao: {
        color: CORES.acento,
    },
    horarios: {
        flexDirection: 'row',
        gap: 12,
    },
    horarioToque: {
        flex: 1,
    },
    horarioCard: {
        flex: 1,
        borderRadius: 23,
        padding: 19,
        borderWidth: 1,
        borderColor: CORES.icone + '33',
    },
    horarioLabel: {
        fontSize: 13,
        color: CORES.textoSuave,
        marginTop: 16,
    },
    horarioValor: {
        fontSize: 29,
        color: '#F4F8E9',
        fontWeight: '700',
        marginTop: 6,
    },
    metaCard: {
        borderRadius: 25,
        padding: 21,
        borderWidth: 1,
        borderColor: CORES.icone + '33',
    },
    metaTopo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 8,
    },
    metaTituloGrupo: {
        flexDirection: 'row',
        gap: 9,
        alignItems: 'center',
        flex: 1,
    },
    metaValor: {
        color: '#F4F8E9',
        fontSize: 25,
        fontWeight: '700',
        marginTop: 14,
    },
    barra: {
        height: 9,
        borderRadius: 10,
        backgroundColor: '#FFFFFF1A',
        overflow: 'hidden',
        marginTop: 19,
    },
    barraPreenchida: {
        height: '100%',
        backgroundColor: CORES.acento,
        borderRadius: 10,
    },
    metaRodape: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 9,
    },
    metaLegenda: {
        color: CORES.textoSuave,
        fontSize: 12,
    },
    nota: {
        color: '#B7CAA4',
        fontSize: 12,
        lineHeight: 18,
        marginTop: 20,
    },
    estado: {
        padding: 25,
        paddingVertical: 70,
        alignItems: 'center',
        gap: 18,
    },
    estadoTitulo: {
        fontSize: 23,
        fontWeight: '700',
        color: '#29491A',
    },
    estadoTexto: {
        textAlign: 'center',
        color: '#42582F',
        fontSize: 15,
        lineHeight: 23,
    },
    botao: {
        backgroundColor: '#29491A',
        borderRadius: 18,
        minHeight: 52,
        padding: 15,
        justifyContent: 'center',
        alignItems: 'center',
    },
    botaoTexto: {
        color: '#F4FFE3',
        fontWeight: '700',
        fontSize: 15,
    },
    botaoSecundario: {
        backgroundColor: '#EEF3E5',
    },
    botaoTextoSecundario: {
        color: '#405B2E',
    },
    desabilitado: {
        opacity: 0.45,
    },
    fundoModal: {
        flex: 1,
        backgroundColor: '#14210DC0',
        justifyContent: 'center',
        padding: 18,
    },
    modal: {
        width: '100%',
        maxWidth: 470,
        maxHeight: '94%',
        alignSelf: 'center',
        borderRadius: 28,
        backgroundColor: '#FCFDF7',
        overflow: 'hidden',
    },
    modalConteudo: {
        padding: 24,
        gap: 16,
    },
    modalTopo: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    modalIcone: {
        width: 45,
        height: 45,
        borderRadius: 16,
        backgroundColor: '#E9F1DB',
        alignItems: 'center',
        justifyContent: 'center',
    },
    fechar: {
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalTitulo: {
        color: '#29451E',
        fontSize: 26,
        fontWeight: '700',
    },
    modalDescricao: {
        color: '#5E7052',
        fontSize: 14,
        lineHeight: 21,
    },
    labelEscuro: {
        color: '#4D6041',
        fontSize: 14,
    },
    previa: {
        padding: 16,
        borderRadius: 17,
        backgroundColor: '#EAF2DC',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    previaTexto: {
        flex: 1,
    },
    previaValor: {
        color: '#29451E',
        fontSize: 23,
        fontWeight: '700',
        marginTop: 3,
    },
    modalAjuda: {
        color: '#67785A',
        fontSize: 12,
        lineHeight: 19,
    },
    erroForm: {
        color: '#913D28',
        backgroundColor: '#FFF0E9',
        padding: 12,
        borderRadius: 12,
        fontSize: 13,
        lineHeight: 20,
    },
    ajusteMeta: {
        padding: 16,
        borderRadius: 18,
        backgroundColor: '#F0F5E6',
        gap: 12,
    },
    ajusteControles: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    ajusteBotao: {
        width: 44,
        height: 44,
        backgroundColor: '#FCFDF7',
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    ajusteValor: {
        fontSize: 28,
        fontWeight: '700',
        color: '#29451E',
    },
});
