# Amparo — versão funcional (v2)

Mesmo design de antes. O que mudou é que os botões que só mostravam um
`Alert` fingindo fazer algo agora fazem de verdade, e as telas passaram a
conversar entre si com dados reais e salvos no aparelho.

## Nova dependência

```bash
npx expo install @react-native-async-storage/async-storage
```

(além das que você já instalou: `expo-router`, `expo-linear-gradient`,
`react-native-svg`, `@expo/vector-icons`)

## O que ficou realmente funcional

- **Dados persistem de verdade** — `context/AppDataContext.jsx` salva
  diário, humores, horários de sono e perfil com `AsyncStorage`. Feche o
  app, abra de novo: está tudo lá.
- **Diário** — criar, editar e excluir realmente grava no dispositivo
  (antes sumia ao recarregar). Lista vazia agora mostra uma mensagem em
  vez de ficar em branco.
- **Registro Emocional** — escolher um humor agora **grava o registro do
  dia** de verdade. A tela mostra uma marquinha (✓) no humor já registrado
  hoje, e uma mensagem avisando. O modal também ganhou as etiquetas de
  sub-emoção clicáveis (seleciona quais combinam com você).
- **Sono** — os botões "Editar" agora abrem um seletor de horário de
  verdade (steppers de hora/minuto), não um alerta. O valor salvo persiste
  e alimenta o cálculo de horas dormidas em tempo real.
- **Gráfico (Evolução emocional)** — o pizza e os textos de insight agora
  são **calculados a partir dos registros reais** de humor (filtráveis por
  Dia/Semana/Mês) e do horário de sono salvo — não são mais números fixos.
  Se não houver nenhum registro no período, aparece um estado vazio com
  botão direto para a tela de Registro Emocional.
- **Login** — validação de verdade (email precisa ter formato válido,
  senha mínima de 4 caracteres), com mensagem de erro inline.
- **Home** — cumprimenta pelo nome salvo no Perfil e mostra uma marquinha
  no botão "Registro emocional" se você já registrou hoje.
- **Perfil** — editar nome e o toggle de notificações agora salvam de
  verdade; "Sair" pede confirmação antes de voltar pro Login.

## Ajustes visuais pequenos (sem mudar a essência)

- Botões (`Pressable`) ganharam um leve efeito de opacidade ao tocar, pra
  dar feedback visual de que o toque foi registrado.
- Estados vazios (Diário sem entradas, Gráfico sem registros) em vez de
  tela em branco.
- Botão "Salvar" do Diário fica desabilitado/opaco se o texto estiver
  vazio.

## Como instalar por cima do que você já tem

1. Extraia este zip.
2. Substitua sua pasta `src` inteira por essa (como da última vez).
3. Rode `npx expo install @react-native-async-storage/async-storage`
   (as outras dependências você já tem).
4. `npx expo start`.
