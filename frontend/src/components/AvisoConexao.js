import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { observarEsperaConexao } from '../services/api';
import { CORES, MEDIDAS } from '../theme/tema';
import { criarEstilos } from '../theme/estilos';

export default function AvisoConexao() {
    const [demorando, setDemorando] = useState(false);
    const { bottom } = useSafeAreaInsets();

    useEffect(() => observarEsperaConexao(setDemorando), []);

    if (!demorando) return null;

    return (
        <View style={[styles.aviso, { bottom: bottom + MEDIDAS.alturaBarra + 8 }]} pointerEvents="none">
            <Text style={styles.texto} accessibilityLiveRegion="polite">
                A conexão está demorando. Aguarde mais um pouco.
            </Text>
        </View>
    );
}

const styles = criarEstilos({
    aviso: {
        position: 'absolute',
        left: 16,
        right: 16,
        zIndex: 1,
        borderRadius: 12,
        backgroundColor: CORES.cartao,
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    texto: {
        color: CORES.textoSuave,
        textAlign: 'center',
        fontSize: 14,
        lineHeight: 20,
    },
});
