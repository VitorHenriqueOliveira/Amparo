import { useState } from 'react';
import { ScrollView } from 'react-native';
import { criarEstilos } from '../theme/estilos';

export default function ConteudoAjustavel({ children, contentContainerStyle }) {
    const [alturaDisponivel, setAlturaDisponivel] = useState(0);
    const [alturaConteudo, setAlturaConteudo] = useState(0);

    return (
        <ScrollView
            style={styles.area}
            contentContainerStyle={contentContainerStyle}
            onLayout={({ nativeEvent }) => setAlturaDisponivel(nativeEvent.layout.height)}
            onContentSizeChange={(_, altura) => setAlturaConteudo(altura)}
            scrollEnabled={alturaConteudo > alturaDisponivel + 1}
            showsVerticalScrollIndicator={false}
            bounces={false}
            alwaysBounceVertical={false}
            overScrollMode="never"
            keyboardShouldPersistTaps="handled"
        >
            {children}
        </ScrollView>
    );
}

const styles = criarEstilos({
    area: {
        flex: 1,
        minHeight: 0,
    },
});
