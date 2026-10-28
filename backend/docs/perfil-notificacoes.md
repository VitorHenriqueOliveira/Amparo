# Backend de notificações e foto de perfil

As rotas abaixo exigem `Authorization: Bearer <token da sessão>`. O proprietário vem exclusivamente do JWT. As alterações anteriores do cadastro da issue #26 foram preservadas na mesma branch.

## Preparação

Aplicar as migrações `009_notificacoes.sql` e `010_foto_perfil.sql` com `npm run db:migrate` no ambiente escolhido antes de iniciar esta versão da API. Não há alteração das contas ou dos históricos existentes. A migração cria três tabelas de notificações e uma tabela com uma foto por conta.

## Foto de perfil — #29

- `PUT /api/perfil/foto`: corpo binário do arquivo com `Content-Type: image/jpeg`, `image/png` ou `image/webp`. Não utiliza JSON nem multipart. Limite de 2 MB, 16 milhões de pixels e uma imagem estática. Retorna `{ "foto_url": "/api/perfil/foto?v=<versão>" }`.
- `GET /api/perfil/foto`: devolve a imagem da própria conta. Sem foto, retorna 404; a interface deve exibir o avatar padrão.
- `DELETE /api/perfil/foto`: remove a própria foto e retorna 204.

A API decodifica e reprocessa o arquivo, limita-o a 512 × 512 pixels, converte para WebP e remove os metadados. Conteúdo, dimensões e versão são gravados atomicamente no PostgreSQL existente. Falhas não substituem a imagem anterior. O envio tem limite de 20 tentativas por conta por hora.

Login, sessão, consulta do perfil, edição do nome e alteração da preferência devolvem `foto_url`, com valor nulo quando não houver imagem. A referência é relativa à origem da API; a imagem também exige o cabeçalho de autenticação. O cliente deve incluí-lo ao exibir ou buscar a foto.

## Notificações — #28

- `PUT /api/notificacoes/dispositivos`: JSON com `id_instalacao` (UUID persistido por instalação), `expo_token` e `permissao` (booleano). A resposta contém somente identificação e estado, sem devolver o token de push. Repetir o cadastro da mesma instalação atualiza o token e transfere o vínculo à conta autenticada quando houver troca de conta.
- `DELETE /api/notificacoes/dispositivos/:id_instalacao`: desvincula somente o dispositivo da conta autenticada; retorna 204. Chamar antes de descartar a sessão no logout. Instalações de outras contas não são alteradas.
- `GET /api/notificacoes/lembretes`: retorna `{ "st_notificacao": true, "lembretes": [] }` com as configurações da própria conta.
- `PUT /api/notificacoes/lembretes/:tipo`: tipos `emocao`, `diario` e `sono`. JSON com `horario` (`HH:mm`), `fuso_horario` (por exemplo, `America/Sao_Paulo`) e `st_ativo` (booleano). Cada tipo configura um lembrete diário por conta.
- `PUT /api/perfil/notificacoes`: mantém o contrato `{ "st_notificacao": false }`; suspende todos os envios e cancela as tentativas pendentes, preservando os horários configurados. Ao reativar, os próximos lembretes voltam a ser considerados.

O token Expo não pode estar vinculado a duas instalações. Caso o serviço retorne 409 no registro, a instalação anterior deve ser desvinculada ou o token deve ser renovado pelo aplicativo. O UUID deve continuar igual entre aberturas e trocas de conta no mesmo dispositivo.

O processador confere preferência, permissão, vínculo e horário antes do envio. A mensagem é genérica e não contém textos do diário, emoções, identificação da conta nem dados privados. A reserva diária por lembrete e instalação impede duplicação entre processos e no retorno do horário de verão. O serviço verifica recibos do Expo após 15 minutos e desativa tokens inválidos sem afetar um token renovado depois do envio.

Recusas confirmadas por limite do serviço têm até três tentativas com espera crescente. Falhas sem confirmação, como timeout, não são reenviadas naquele dia, pois o provedor pode já ter recebido a mensagem. O estado interno `entregue` significa aceitação por FCM/APNs, sem garantir que a pessoa viu a notificação. Os registros técnicos de envio são mantidos por 30 dias.

### Execução na hospedagem

Configurar as credenciais Android/iOS de push no projeto EAS. Se a segurança adicional do Expo Push estiver ativada, definir `EXPO_ACCESS_TOKEN` somente no servidor. Nenhuma credencial deve ir para o aplicativo.

Escolher uma forma de execução:

- Definir `NOTIFICACOES_ATIVAS=true` para processar a cada minuto enquanto a API estiver executando.
- Manter a variável desativada e executar `npm run notificacoes:enviar` a cada minuto em um agendador da hospedagem com acesso ao mesmo banco.

A hospedagem gratuita do Render pode suspender a API inativa, conforme a [documentação do plano gratuito](https://render.com/docs/free#spinning-down-on-idle); o intervalo interno não mantém o serviço acordado. Para horários regulares, utilizar um processo contínuo ou um agendador independente. O processador aceita somente lembretes dos últimos 15 minutos e não envia lembretes antigos ao despertar.

As variáveis novas estão desativadas/vazias no exemplo. A implementação e os testes não ativam a entrega nem enviam push real.

Referência do protocolo: [envio e recibos do Expo Push](https://docs.expo.dev/push-notifications/sending-notifications/).

### Integração posterior do aplicativo

O frontend ainda precisa solicitar a permissão, obter o token Expo, registrar/desvincular a instalação, configurar os horários e integrar galeria/câmera e avatar. A seleção e a confirmação de senha do cadastro também continuam sendo responsabilidade da tela correspondente. A entrega efetiva deve ser validada em dispositivo físico após essa integração.
