# ☀️ Amparo

![GitHub Licença](https://img.shields.io/badge/Licença-MIT-success.svg?style=flat-square&color=76ce3b)
![SDK](https://img.shields.io/badge/SDK-57.0.30-4630EB?style=flat&logo=expo&logoColor=white&labelColor=000000)
![NPM](https://img.shields.io/badge/NPM-12.2.0-brightgreen?style=flat&logo=npm&logoColor=white)

## 🌱 Buscando auxiliar no bem-estar psicológico dos adolescentes.

O aumento do uso excessivo de tecnologia e redes sociais contribui para o crescimento de ansiedade e depressão entre jovens. Soluções digitais podem fornecer intervenção precoce e suporte contínuo, impactando positivamente na qualidade de vida dos usuários.  

## 🛠️ Tecnologias Utilizadas

A stack foi escolhida para garantir facilidade no desenvolvimento multiplataforma com o Expo e alta performance no gerenciamento de dados relacionais com o Neon DB (PostgreSQL).

| **Categoria**      | **Tecnologia** |
| :----------------- | :------------- |
| **Backend**        | ![Node.js](https://img.shields.io/badge/Node.js-43853d?style=for-the-badge&logo=node.js&logoColor=white)   |
| **Mobile**         | ![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black) ![React Native](https://img.shields.io/badge/React%20Native-61dafb?style=for-the-badge&logo=react&logoColor=black) ![Expo](https://img.shields.io/badge/Expo-000020?style=for-the-badge&logo=expo&logoColor=white)      |
| **Banco de Dados** | ![Neon](https://img.shields.io/badge/Neon-00E599?style=for-the-badge&logo=neon&logoColor=black) ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white) |

## ❓ Como Executar o Projeto

> [!WARNING]
> O projeto se encontra em desenvolvimento ativo. Siga o passo a passo para testar a interface atual em um ambiente local.

### 📋 Pré-requisitos

* [Git](https://git-scm.com/install/windows) - sistema de controle de versão
* [Node.js 24 LTS](https://nodejs.org/pt-br/download) - Inclui o Gerenciador NPM
* [Neon](https://neon.tech/) ou outro PostgreSQL - banco de desenvolvimento para a API
* [Expo Go para Android](https://play.google.com/store/apps/details?id=host.exp.exponent)
* [Expo Go para iOS](https://apps.apple.com/us/app/expo-go/id982107779)

> **Nota:** É possível escolher rodar no navegador, não sendo necessário instalar o Expo Go. Para usar o celular, o Expo Go deve ser compatível com o SDK 57 do projeto; consulte as versões disponíveis em [expo.dev/go](https://expo.dev/go). No iOS físico, se a versão da App Store não suportar esse SDK, utilize uma [build de desenvolvimento](https://docs.expo.dev/develop/development-builds/introduction/).

---

### 📂 Passo a passo

#### Baixar o projeto

PowerShell / CMD / GitBash:

```bash
git clone https://github.com/VitorHenriqueOliveira/Amparo
```

#### Entrar na pasta do Amparo

PowerShell / CMD / GitBash:

```bash
cd Amparo
```

#### Entrar na pasta de backend

PowerShell / CMD / GitBash:

```bash
cd backend
```

#### Instalar as dependências:

PowerShell / CMD / GitBash:

```bash
npm ci
```

#### Configurar o ambiente do backend

Crie o arquivo `backend/.env` a partir de `backend/.env.example` e configure:

| **Variável** | **Configuração local** |
| :------------ | :--------------------- |
| `DATABASE_URL` | Conexão PostgreSQL do banco de desenvolvimento; no Neon, mantenha `sslmode=require` |
| `JWT_SECRET` | Segredo aleatório com pelo menos 32 bytes, exclusivo do ambiente |
| `PORT` | `3000` |
| `NODE_ENV` | `development` |
| `CORS_ORIGINS` | `http://localhost:8081,http://127.0.0.1:8081` |
| `TRUST_PROXY_HOPS` | `0` na execução local |

#### Rodar o servidor

PowerShell / CMD / GitBash:

```bash
node src/server.js
```

> **Nota:** O backend atende na porta `3000` por padrão, com as rotas da API em `http://localhost:3000/api`. Mantenha esse terminal aberto.

#### Entrar na pasta de frontend

Abra um segundo terminal na pasta `Amparo`:

PowerShell / CMD / GitBash:

```bash
cd frontend
```

#### Instalar as dependências:

PowerShell / CMD / GitBash:

```bash
npm ci
```

#### Configurar o ambiente do frontend

Crie o arquivo `frontend/.env` a partir de `frontend/.env.example`. Para testar no navegador do computador, mantenha:

```dotenv
EXPO_PUBLIC_API_URL=http://localhost:3000/api
```

No celular, substitua `localhost` pelo IP do computador na rede local, mantenha o sufixo `/api` e conecte os dois dispositivos à mesma rede. 
Se mudar a porta ou a origem web do Expo, ajuste também `CORS_ORIGINS` no backend.

#### Executar o projeto:

PowerShell / CMD / GitBash:

```bash
npx expo start
```

#### Link do servidor de desenvolvimento do Expo

```text
http://localhost:8081
```

> **Nota:** Se estiver utilizando o Expo Go: Um QR Code será exibido no terminal, abra o aplicativo Expo Go no seu celular e escaneie o código para visualizar o app.
> Para abrir no navegador, pressione `w` no terminal do Expo ou execute `npm run web` na pasta `frontend`.

## 👥 Equipe do Projeto

O desenvolvimento do projeto foi realizado pela seguinte equipe:

| **Função**         | **Integrantes**                 |
| :----------------- | :------------------------------ |
| **Backend**        | Vitor Oliveira                  | 
| **Mobile**         | Sophia Prado & Carlos Gomes     |
| **Banco de Dados** | Emerson Barbosa & Pedro Geballi |

## ✅ Conceito de pronto

Uma funcionalidade nova será considerada concluída apenas quando atender os seguintes critérios:

- O código foi testado e aprovado por pelo menos um outro desenvolvedor.
- O testador não identificou nenhum bug crítico.
- Toda a documentação do sistema foi atualizada.
- O código foi integrado ao repositório principal do projeto.

## 📚 Documentação

Para mais detalhes sobre a documentação, especificações técnicas e pesquisas realizadas:
 
- [Documentação](https://docs.google.com/document/d/1nOHPZHFb7zF-VEaVPTtvxNx0Jwl455FKO8_sslU9eu4/edit?usp=sharing)
- [Especificação de Casos de Uso](https://docs.google.com/document/d/1Ck6EZCFioj6pZ4LhuvUBVGhGwfjaz90cURt_v9vB9Ec/edit?usp=sharing)
- [Especificações Técnicas](https://docs.google.com/document/d/1xHQsBjWIKVvXDSzJVMC15NYrmXO_gETcM5asq6WKtAs/edit?usp=sharing)
- [Diagrama de Arquitetura](https://docs.google.com/document/d/1zlUJwYatcSVM3Y5DdBzmsBXZAXW-wv2cJCZjdj8yTuk/edit?usp=sharing)
