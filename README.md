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
| **Mobile / Web**   | ![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black) ![React Native](https://img.shields.io/badge/React%20Native-61dafb?style=for-the-badge&logo=react&logoColor=black) ![Expo](https://img.shields.io/badge/Expo-000020?style=for-the-badge&logo=expo&logoColor=white)      |
| **Banco de Dados** | ![Neon](https://img.shields.io/badge/Neon-00E599?style=for-the-badge&logo=neon&logoColor=black) ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white) |
| **Hospedagem da API** | ![Render](https://img.shields.io/badge/Render-000000?style=for-the-badge&logo=render&logoColor=white) |
| **Build Android** | ![EAS Build](https://img.shields.io/badge/EAS%20Build-000020?style=for-the-badge&logo=expo&logoColor=white) |

## ❓ Como Executar o Projeto

> [!WARNING]
> O projeto se encontra em desenvolvimento ativo. Escolha uma das opções abaixo para experimentar o Amparo.

* **Web ou Expo Go:** execute o projeto pelo computador e abra no navegador ou no celular.
* **Build Android:** instale o aplicativo pronto no celular, conectado à API hospedada.

## 🌐 Web ou Expo Go

### Pré-requisitos

* [Git](https://git-scm.com/install/windows) - sistema de controle de versão
* [Node.js 24 LTS](https://nodejs.org/pt-br/download) - Inclui o Gerenciador NPM
* [Neon](https://neon.tech/) ou outro PostgreSQL - banco de desenvolvimento para a API
* [Expo Go para Android](https://play.google.com/store/apps/details?id=host.exp.exponent)
* [Expo Go para iOS](https://apps.apple.com/us/app/expo-go/id982107779)

> **Nota:** Para abrir no navegador, basta seguir os passos abaixo pelo computador. No Android, selecione o SDK 57 em [expo.dev/go](https://expo.dev/go) para instalar o Expo Go compatível. No iPhone, se a versão da App Store não suportar esse SDK, utilize a opção Web.

---

### Baixar o projeto

PowerShell / CMD / GitBash:

```bash
git clone https://github.com/VitorHenriqueOliveira/Amparo
```

### Entrar na pasta do Amparo

PowerShell / CMD / GitBash:

```bash
cd Amparo
```

### Entrar na pasta de backend

PowerShell / CMD / GitBash:

```bash
cd backend
```

### Instalar as dependências do backend

PowerShell / CMD / GitBash:

```bash
npm ci
```

### Configurar o ambiente do backend

Crie o arquivo `backend/.env` a partir de `backend/.env.example` e configure:

| **Variável** | **Configuração local** |
| :------------ | :--------------------- |
| `DATABASE_URL` | Conexão PostgreSQL do banco de desenvolvimento; no Neon, mantenha `sslmode=require` |
| `JWT_SECRET` | Segredo aleatório com pelo menos 32 bytes, exclusivo do ambiente |
| `PORT` | `3000` |
| `NODE_ENV` | `development` |
| `CORS_ORIGINS` | `http://localhost:8081,http://127.0.0.1:8081` |
| `TRUST_PROXY_HOPS` | `0` na execução local |

### Preparar o banco de dados

Na pasta `backend`, prepare as tabelas do banco configurado no arquivo `.env`:

PowerShell / CMD / GitBash:

```bash
npm run db:migrate
```

### Rodar o servidor

PowerShell / CMD / GitBash:

```bash
node src/server.js
```

> **Nota:** O backend atende na porta `3000` por padrão, com as rotas da API em `http://localhost:3000/api`. Mantenha esse terminal aberto.

### Entrar na pasta de frontend

Abra um segundo terminal na pasta `Amparo`:

PowerShell / CMD / GitBash:

```bash
cd frontend
```

### Instalar as dependências do frontend

PowerShell / CMD / GitBash:

```bash
npm ci
```

### Configurar o ambiente do frontend

Crie o arquivo `frontend/.env` a partir de `frontend/.env.example`. Para testar no navegador do computador, mantenha:

```dotenv
EXPO_PUBLIC_API_URL=http://localhost:3000/api
```

No celular, substitua `localhost` pelo IP do computador na rede local, mantenha o sufixo `/api` e conecte os dois dispositivos à mesma rede. 
Se mudar a porta ou a origem web do Expo, ajuste também `CORS_ORIGINS` no backend.

### Executar o projeto

PowerShell / CMD / GitBash:

```bash
npx expo start
```

### Abrir no navegador ou no Expo Go

```text
http://localhost:8081
```

* **No navegador:** pressione `w` no terminal do Expo ou execute `npm run web` na pasta `frontend`.
* **No Expo Go:** abra o aplicativo no celular e escaneie o QR Code exibido no terminal. No iPhone, abra o QR Code pela câmera.

Mantenha os terminais do backend e do Expo abertos enquanto estiver utilizando esta opção.

## 📱 Build Android (APK)

### Pré-requisitos

* Celular com Android 7.0 ou superior.
* Conexão com a internet para entrar e acessar seus registros.

### Baixar o aplicativo

Abra a pré-release pelo celular e baixe o arquivo APK na seção **Assets**:

[Acessar a pré-release v1.0.0-beta.1](https://github.com/VitorHenriqueOliveira/Amparo/releases/tag/v1.0.0-beta.1)

Se preferir, [baixe o APK diretamente](https://github.com/VitorHenriqueOliveira/Amparo/releases/download/v1.0.0-beta.1/amparo-1.0.0-teste-v3.apk).

**Versão disponível:** 1.0.0 (build 3).

### Instalar e abrir

1. Abra o arquivo APK baixado e conclua a instalação no Android.
2. Abra o aplicativo **Amparo (Teste)**.
3. Entre com sua conta.

Se já tiver a versão anterior instalada, instale esta atualização por cima dela.

A build utiliza a API hospedada e pode ser usada sem manter o computador ligado ou configurar o ambiente local.

> **Nota:** O primeiro acesso após um período sem uso pode demorar um pouco enquanto o servidor é ativado.

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
