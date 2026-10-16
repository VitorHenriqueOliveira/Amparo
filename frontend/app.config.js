module.exports = ({ config }) => {
    const variante = process.env.APP_VARIANT;
    const sufixo = variante === 'preview' ? '.preview' : variante === 'development' ? '.dev' : '';
    const identificador = `com.vitoncio.amparo${sufixo}`;

    return {
        ...config,
        name: variante === 'preview' ? 'Amparo (Teste)' : variante === 'development' ? 'Amparo (Dev)' : 'Amparo',
        scheme: sufixo ? `amparo-${variante}` : 'amparo',
        android: {
            ...config.android,
            package: identificador,
        },
        ios: {
            ...config.ios,
            bundleIdentifier: identificador,
        },
    };
};
