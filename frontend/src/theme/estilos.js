import { Platform, processColor, StyleSheet } from 'react-native';

function corDaSombra(cor, opacidade = 1) {
    const valor = processColor(cor);
    const vermelho = (valor >>> 16) & 255;
    const verde = (valor >>> 8) & 255;
    const azul = valor & 255;
    const alfa = (((valor >>> 24) & 255) / 255 * opacidade).toFixed(2);

    return `rgba(${vermelho},${verde},${azul},${alfa})`;
}

export function criarEstilos(definicoes) {
    // Os aplicativos nativos mantêm suas sombras; a web recebe as propriedades CSS atuais.
    if (Platform.OS !== 'web') return StyleSheet.create(definicoes);

    const estilosWeb = Object.fromEntries(Object.entries(definicoes).map(([nome, estilo]) => {
        const {
            shadowColor, shadowOffset, shadowOpacity, shadowRadius,
            textShadowColor, textShadowOffset, textShadowRadius,
            ...atual
        } = estilo;

        if (shadowColor != null || shadowOffset != null || shadowOpacity != null || shadowRadius != null) {
            const { width = 0, height = 0 } = shadowOffset || {};
            atual.boxShadow = `${width}px ${height}px ${shadowRadius || 0}px ${corDaSombra(shadowColor || 'black', shadowOpacity)}`;
        }

        if (textShadowColor != null || textShadowOffset != null || textShadowRadius != null) {
            const { width = 0, height = 0 } = textShadowOffset || {};
            atual.textShadow = `${width}px ${height}px ${textShadowRadius || 0}px ${textShadowColor || 'black'}`;
        }

        return [nome, atual];
    }));

    return StyleSheet.create(estilosWeb);
}
