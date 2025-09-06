# Site Professor Yago

Plataforma para correção de redações do Professor Yago Sales.

## Credenciais do Professor

Para acessar o sistema como professor, use:
- **E-mail:** prof.yago.red@gmail.com
- **Senha:** TR24339es

## Estrutura do Projeto

Este é um monorepo com duas principais partes:

- `/api` - Backend Node.js com Express e MongoDB
- `/frontend` - Frontend React com Vite, TypeScript e Tailwind CSS

## Configuração do Ambiente de Desenvolvimento

### Requisitos

- Node.js 20.x
- MongoDB
- Conta Cloudinary (para armazenamento de PDFs)

### Frontend

```bash
cd frontend
npm install
npm run dev
```

O frontend estará disponível em `http://localhost:5173`

### Backend

```bash
cd api
npm install
npm run dev
```

A API estará disponível em `http://localhost:5050`

## Criando o Usuário Professor Padrão

Para criar o usuário professor padrão com as credenciais:
- E-mail: prof.yago.red@gmail.com
- Senha: TR24339es

Execute:

```bash
cd api
npm run create-teacher
```

## Implantação no Render

### Configuração do Render

1. Conecte seu repositório GitHub ao Render
2. **IMPORTANTE:** Certifique-se de que a versão do pacote `node-fetch` no `api/package.json` seja `^2.7.0` e não `^3.x.x`, pois a versão 3 é ESM-only e não funciona com `require()`.
3. Configure 2 serviços web:

#### API (Backend)
- **Nome:** site-professor-yago-api
- **Tipo:** Web Service
- **Runtime:** Node
- **Root Directory:** `/api` (importante!)
- **Build Command:** `npm install`
- **Start Command:** `npm start`

#### Frontend
- **Nome:** site-professor-yago-frontend
- **Tipo:** Static Site
- **Root Directory:** `/frontend`
- **Build Command:** `npm install && npm run build`
- **Publish Directory:** `dist`

### Variáveis de Ambiente

#### Backend
- `MONGO_URI` - URI de conexão do MongoDB
- `JWT_SECRET` - Chave secreta para tokens JWT
- `CLOUDINARY_CLOUD_NAME` - Nome da conta Cloudinary
- `CLOUDINARY_API_KEY` - Chave API do Cloudinary
- `CLOUDINARY_API_SECRET` - Segredo API do Cloudinary

#### Frontend
- `VITE_API_BASE_URL` - URL da API (ex: https://site-professor-yago-api.onrender.com)

## Uso do Blueprint do Render

Este projeto inclui um arquivo `render.yaml` para configuração automática dos serviços. Se preferir, você pode usar o Blueprint do Render para implantação mais rápida:

1. Faça fork deste repositório
2. No Render, vá para Blueprint > New Blueprint Instance
3. Conecte seu repositório fork
4. Configure as variáveis de ambiente necessárias
