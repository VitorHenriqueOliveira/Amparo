const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const babel = require('@babel/core');
const StyleSheet = require('react-native-web/dist/cjs/exports/StyleSheet');

test('trocar abas e voltar à Home restaura os cliques dos filhos na navegação web', () => {
    // Usa a cena instalada e o compilador CSS real para detectar incompatibilidades do patch.
    const arquivo = path.join(__dirname, '../node_modules/@react-navigation/bottom-tabs/lib/module/views/BottomTabView.js');
    const ast = babel.parseSync(fs.readFileSync(arquivo, 'utf8'), { configFile: false, babelrc: false });
    ast.program.body = ast.program.body.filter((no) => no.type === 'VariableDeclaration' &&
        no.declarations.some((item) => ['TabScene', 'styles'].includes(item.id.name)));
    const { code } = babel.transformFromAstSync(ast, null, { configFile: false, babelrc: false });
    const jsx = (tipo, props) => ({ tipo, props });
    const contexto = vm.createContext({
        React: { memo: (componente) => componente }, StyleSheet, _jsx: jsx,
        MaybeScreen: 'MaybeScreen', Screen: 'Screen', Header: 'Header',
        BottomTabBarHeightContext: { Provider: 'Provider' },
        SafeAreaProviderCompat: { initialMetrics: { frame: {} } },
        getHeaderTitle: () => 'Teste', hasAnimation: () => false,
        NAMED_TRANSITIONS_PRESETS: { none: {} },
        STATE_ON_TOP: 2, STATE_INACTIVE: 0, STATE_TRANSITIONING_OR_BELOW_TOP: 1,
    });
    vm.runInContext(code + '\nthis.renderizarCena = TabScene;', contexto);

    for (const focada of [true, false, true, false, true]) {
        const cena = contexto.renderizarCena({
            route: { name: 'Home' },
            isFocused: focada, isPreloaded: false, isAnimatingRoute: false,
            descriptor: { options: {}, route: { name: 'Home' }, navigation: {}, render: () => 'Home' },
        });
        const [classes, inline] = StyleSheet(cena.props.style);
        const css = StyleSheet.getSheet().textContent.replace(/\s/g, '');
        const classe = classes.split(' ').find((nome) => nome.startsWith('r-pointerEvents-'));

        assert.ok(classe, 'A cena precisa de regras CSS que tratem também os filhos.');
        assert.equal(inline?.pointerEvents, undefined);
        assert.ok(css.includes('.' + classe + '>*{pointer-events:' + (focada ? 'auto' : 'none') + ';}'));
    }
});
