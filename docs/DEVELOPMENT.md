# Guia de Desenvolvimento

Este documento explica como configurar e executar o projeto em ambiente de desenvolvimento.

## 🚀 Configuração Rápida

### Pré-requisitos

- Node.js 20+
- MongoDB 7.0+
- Git

### Setup Automático

```bash
# Executar script de configuração
./scripts/dev-setup.sh
```

### Setup Manual

1. **Instalar dependências:**
   ```bash
   # Backend
   cd backend
   npm ci
   
   # Frontend
   cd ../frontend
   npm ci
   ```

2. **Configurar banco de dados:**
   ```bash
   # Executar seed de desenvolvimento
   cd backend
   npm run seed:dev
   ```

3. **Iniciar servidores:**
   ```bash
   # Terminal 1 - Backend
   cd backend
   npm run dev
   
   # Terminal 2 - Frontend
   cd frontend
   npm run dev
   ```

## 🧪 Testes E2E

### Executar Testes

```bash
# Todos os testes
cd frontend
npm run e2e

# Apenas testes de smoke
npm run e2e:smoke

# Interface visual
npm run e2e:ui

# Modo debug
npm run e2e:debug
```

### Testes Disponíveis

- **smoke.spec.ts**: Testes de fumaça do fluxo principal
- **seed-verification.spec.ts**: Verificação dos dados do seed

## 📊 Dados de Teste

O seed de desenvolvimento cria:

### Professor
- **Email:** professor@yagosales.com
- **Senha:** 123456

### Alunos (10 alunos)
- **Emails:** [nome]@email.com
- **Senha:** 123456
- **Nomes:** Ana Silva, Bruno Santos, Carlos Oliveira, etc.

### Turmas
- **3º A - Redação** (5 alunos)
- **3º B - Literatura** (4 alunos)

### Dados Criados
- 1 avaliação objetiva
- 2 gabaritos (ENEM e PAS)
- 3 temas de redação
- 2 redações (1 pendente, 1 corrigida)
- 3 avisos (1 imediato, 2 agendados)
- 2 conteúdos futuros
- Registros de caderno para 3 dias

## 🔧 Scripts Úteis

### Backend
```bash
npm run dev          # Desenvolvimento
npm run start        # Produção
npm run seed:dev     # Executar seed
npm test            # Testes unitários
```

### Frontend
```bash
npm run dev         # Desenvolvimento
npm run build       # Build para produção
npm run preview     # Preview do build
npm run e2e         # Testes E2E
npm run e2e:smoke   # Testes de smoke
npm run e2e:ui      # Interface visual dos testes
```

## 🐛 Debugging

### Logs do Backend
```bash
cd backend
DEBUG=* npm run dev
```

### Logs do Frontend
```bash
cd frontend
npm run dev -- --debug
```

### Testes E2E com Debug
```bash
cd frontend
npm run e2e:debug
```

## 📁 Estrutura do Projeto

```
├── backend/
│   ├── models/          # Modelos do MongoDB
│   ├── controllers/     # Controladores da API
│   ├── routes/          # Rotas da API
│   ├── scripts/         # Scripts utilitários
│   │   └── seed-dev.js  # Seed de desenvolvimento
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── pages/       # Páginas da aplicação
│   │   ├── components/  # Componentes React
│   │   ├── services/    # Serviços da API
│   │   └── utils/       # Utilitários
│   ├── e2e/            # Testes E2E
│   │   ├── smoke.spec.ts
│   │   └── seed-verification.spec.ts
│   └── package.json
├── scripts/
│   └── dev-setup.sh    # Script de configuração
└── .github/workflows/
    └── e2e-smoke.yml   # CI/CD para testes E2E
```

## 🚨 Solução de Problemas

### MongoDB não conecta
```bash
# Verificar se está rodando
brew services list | grep mongo

# Iniciar se necessário
brew services start mongodb-community
```

### Porta já em uso
```bash
# Encontrar processo usando a porta
lsof -ti:3001  # Backend
lsof -ti:5173  # Frontend

# Matar processo
kill -9 <PID>
```

### Testes E2E falham
```bash
# Limpar cache do Playwright
cd frontend
npx playwright install --force

# Executar com mais logs
DEBUG=pw:api npm run e2e:smoke
```

## 📝 Contribuindo

1. Faça fork do repositório
2. Crie uma branch para sua feature
3. Execute os testes: `npm run e2e:smoke`
4. Faça commit das alterações
5. Abra um Pull Request

## 🔗 Links Úteis

- [Playwright Documentation](https://playwright.dev/)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vitejs.dev/)
