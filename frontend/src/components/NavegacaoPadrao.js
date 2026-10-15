import { criarEstilos } from '../theme/estilos';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { CORES, DEGRADES, MEDIDAS } from '../theme/tema';

const atalhos = [
    { rota: 'Diario', icone: 'book-outline', titulo: 'Diário Emocional' },
    { rota: 'Emocao', icone: 'happy-outline', titulo: 'Registro Emocional' },
    { rota: 'Sono', icone: 'moon-outline', titulo: 'Registro de Sono' },
    { rota: 'Grafico', icone: 'trending-up-outline', titulo: 'Evolução Emocional' },
    { rota: 'ModoCalma', icone: 'heart-outline', titulo: 'Modo Calma Urgente' },
];

export function AreaDaTela({ children }) {
    return <SafeAreaView style={styles.area}>{children}</SafeAreaView>;
}

export function Cabecalho({ titulo, navigation, marca = false, mostrarPerfil = true, onVoltar }) {
    const voltar = () => {
        if (onVoltar) onVoltar();
        else if (navigation?.canGoBack()) navigation.goBack();
        else navigation?.navigate('Home');
    };

    return (
        <LinearGradient
            colors={DEGRADES.navegacao}
            style={[styles.barra, styles.cabecalho]}
            testID="cabecalho-padrao"
        >
            {marca ? (
                <View style={styles.lateral}>
                    <Ionicons name="sunny" size={MEDIDAS.tamanhoIcone} color={CORES.acento} />
                </View>
            ) : (
                <TouchableOpacity
                    onPress={voltar}
                    style={styles.lateral}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel="Voltar"
                >
                    <Ionicons name="chevron-back" size={MEDIDAS.tamanhoIcone} color={CORES.icone} />
                </TouchableOpacity>
            )}
            <Text style={styles.titulo} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
                {titulo}
            </Text>
            {mostrarPerfil ? (
                <TouchableOpacity
                    onPress={() => navigation.navigate('Perfil')}
                    style={styles.lateral}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel="Abrir perfil"
                >
                    <Ionicons name="person-circle-outline" size={26} color={CORES.icone} />
                </TouchableOpacity>
            ) : (
                <View style={styles.lateral} />
            )}
        </LinearGradient>
    );
}

export function NavegacaoInferior({ navigation, ativa }) {
    return (
        <LinearGradient
            colors={DEGRADES.navegacao}
            style={[styles.barra, styles.rodape]}
            testID="navegacao-inferior-padrao"
            accessibilityLabel="Navegação principal"
        >
            {atalhos.map(({ rota, icone, titulo }) => {
                const selecionada = rota === ativa;
                return (
                    <TouchableOpacity
                        key={rota}
                        onPress={() => navigation.navigate(rota)}
                        style={styles.atalho}
                        activeOpacity={0.8}
                        accessibilityRole="button"
                        accessibilityLabel={titulo}
                        accessibilityState={{ selected: selecionada }}
                    >
                        <View style={[styles.circulo, selecionada && styles.selecionado]}>
                            <Ionicons
                                name={icone}
                                size={MEDIDAS.tamanhoIcone}
                                color={selecionada ? CORES.textoEscuro : CORES.textoSuave}
                            />
                        </View>
                    </TouchableOpacity>
                );
            })}
        </LinearGradient>
    );
}

const styles = criarEstilos({
    area: {
        flex: 1,
        minHeight: 0,
        width: '100%',
        maxWidth: MEDIDAS.larguraMaxima,
        alignSelf: 'center',
    },
    barra: {
        height: MEDIDAS.alturaBarra,
        minHeight: MEDIDAS.alturaBarra,
        maxHeight: MEDIDAS.alturaBarra,
        flexGrow: 0,
        flexShrink: 0,
        marginHorizontal: MEDIDAS.margemHorizontal,
        borderRadius: MEDIDAS.alturaBarra / 2,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        elevation: 5,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
    },
    cabecalho: { marginTop: 8, marginBottom: 12 },
    rodape: { marginTop: 8, marginBottom: 8 },
    lateral: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    titulo: {
        flex: 1,
        minWidth: 0,
        textAlign: 'center',
        color: CORES.texto,
        fontSize: 16,
        fontWeight: '700',
    },
    atalho: { flex: 1, minWidth: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    circulo: {
        width: MEDIDAS.tamanhoSelecao,
        height: MEDIDAS.tamanhoSelecao,
        borderRadius: MEDIDAS.tamanhoSelecao / 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    selecionado: {
        backgroundColor: CORES.selecao,
        shadowColor: CORES.selecao,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.65,
        shadowRadius: 6,
        elevation: 4,
    },
});
