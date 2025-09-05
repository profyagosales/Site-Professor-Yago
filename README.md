# Site-Professor-Yago

Sistema completo de gestão de redações para professores e alunos, com correção online, anotações em PDF e dashboard de notas.

## 🏗️ Arquitetura

### Frontend (Vite + React)
- **Framework**: React 18.2.0 com TypeScript
- **Build Tool**: Vite 7.1.2
- **Roteamento**: React Router DOM 7.8.1
- **UI**: Tailwind CSS + Framer Motion
- **PDF**: react-pdf + react-pdf-highlighter
- **Estado**: Context API + Hooks customizados
- **Cache**: Sistema stale-while-revalidate customizado
- **Performance**: Web Vitals + marcadores de performance

### Backend (Node.js + Express)
- **Runtime**: Node.js com Express
- **Banco**: MongoDB com Mongoose
- **Autenticação**: JWT
- **Upload**: Multer + Cloudinary
- **Email**: SMTP
- **Deploy**: Render (produção)

### PDF Viewer (Aplicação separada)
- **Localização**: `apps/pdf-viewer/`
- **Build**: Vite independente
- **Worker**: PDF.js worker isolado
- **Integração**: Via iframe + postMessage

## Required Environment Variables

| Variable | Purpose |
|----------|---------|
| `MONGODB_URI` | Connection string for MongoDB. |
| `JWT_SECRET` | Secret key for signing JSON Web Tokens. |
| `SMTP_HOST` | Hostname of the SMTP server used to send emails. |
| `SMTP_USER` | Username for the SMTP server. |
| `SMTP_PASS` | Password for the SMTP server. |
| `VITE_API_URL` | (Deprecated) Base URL for the backend API used by the frontend. |
| `VITE_API_BASE_URL` | Base URL for the backend API used by the frontend. |
| `VITE_API_PREFIX` | API prefix path (e.g., `/api`). |
| `APP_DOMAIN` | Public domain where the application is served (used for CORS). |
| `SMTP_PORT` | (Optional) Port for the SMTP server. |
| `SMTP_FROM` | (Optional) Email address used in the "from" field. |
| `VITE_USE_RICH_ANNOS` | (Frontend) Enable the new rich PDF annotator (default true in dev). |
| `VITE_VIRT_PDF` | (Frontend) Enable virtualized PDF viewer for performance. |
| `VITE_VIRT_BUFFER` | (Frontend) Virtualization buffer in viewport heights (e.g., 1-3). |
| `ALLOW_DIRECT_FILE_URL` | (Backend) Allows creating essays with a direct `fileUrl` when Cloudinary isn't configured. |

## Exemplo de .env (Produção)

Crie um arquivo `.env` com os valores reais do ambiente:

```env
MONGODB_URI=mongodb+srv://usuario:senha@cluster/app
JWT_SECRET=sua_chave_ultrasecreta
SMTP_HOST=smtp.exemplo.com
SMTP_PORT=587
SMTP_USER=usuario
SMTP_PASS=senha
SMTP_FROM=no-reply@exemplo.com
APP_DOMAIN=https://app.exemplo.com
VITE_API_URL=https://api.exemplo.com
VITE_API_BASE_URL=https://api.exemplo.com
VITE_API_PREFIX=/api
VITE_USE_RICH_ANNOS=true
VITE_VIRT_PDF=true
VITE_VIRT_BUFFER=2
```

## 🚀 Como Rodar

### Pré-requisitos
- Node.js 18+
- MongoDB (local ou Atlas)
- Conta Cloudinary (opcional)

### 1. Instalação
```bash
# Instalar dependências
npm install --prefix frontend
npm install --prefix backend

# Instalar dependências do PDF viewer
cd frontend/apps/pdf-viewer && npm install && cd ../..
```

### 2. Configuração
Crie `.env` na raiz do projeto:
```env
# Backend
MONGODB_URI=mongodb://localhost:27017/site-professor-yago
JWT_SECRET=sua_chave_secreta_aqui
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu_email@gmail.com
SMTP_PASS=sua_senha_app
SMTP_FROM=no-reply@seudominio.com
APP_DOMAIN=http://localhost:5173

# Frontend
VITE_API_BASE_URL=http://localhost:5050
VITE_API_PREFIX=/api
VITE_USE_RICH_ANNOS=true
VITE_VIRT_PDF=true
VITE_VIRT_BUFFER=2
```

### 3. Execução
```bash
# Desenvolvimento (raiz do projeto)
npm run dev

# Ou individualmente:
# Backend: cd backend && npm run dev
# Frontend: cd frontend && npm run dev
```

**URLs de desenvolvimento:**
- Frontend: http://localhost:5173
- Backend: http://localhost:5050
- PDF Viewer: http://localhost:5173/viewer/

## 🔄 Fluxos Principais

### Fluxo Professor
1. **Login**: `/login-professor` → Autenticação JWT
2. **Dashboard**: `/professor/resumo` → Visão geral das turmas
3. **Turmas**: `/professor/turmas` → Gerenciar turmas e alunos
4. **Redações**: `/professor/redacao` → Lista de redações pendentes
5. **Correção**: `/professor/redacao/:id` → Workspace de correção com PDF
6. **Notas**: `/professor/notas-da-classe` → Visualizar notas da turma

### Fluxo Aluno
1. **Login**: `/login-aluno` → Autenticação JWT
2. **Dashboard**: `/aluno/resumo` → Visão geral das notas
3. **Redações**: `/aluno/redacoes` → Enviar redações
4. **Notas**: `/aluno/notas` → Ver notas e correções
5. **Caderno**: `/aluno/caderno` → Conteúdo didático
6. **Gabaritos**: `/aluno/gabaritos` → Acessar gabaritos

### Guardas de Rota
- **RequireAuth**: Verifica JWT e redireciona para login
- **RequireStudentAuth**: Verifica se é aluno
- **ProtectedRoute**: Rota protegida com fallback

## 🗺️ Tabela de Rotas

### Rotas Públicas
| Rota | Path | Descrição |
|------|------|-----------|
| `ROUTES.home` | `/` | Landing page |
| `ROUTES.auth.loginProf` | `/login-professor` | Login professor |
| `ROUTES.auth.loginAluno` | `/login-aluno` | Login aluno |

### Rotas Professor (`/professor`)
| Rota | Path | Descrição |
|------|------|-----------|
| `ROUTES.prof.base` | `/professor` | Base professor (redirect para resumo) |
| `ROUTES.prof.resumo` | `/professor/resumo` | Dashboard professor |
| `ROUTES.prof.turmas` | `/professor/turmas` | Lista de turmas |
| `ROUTES.prof.turmaAlunos(id)` | `/professor/turmas/:id/alunos` | Alunos da turma |
| `ROUTES.prof.notasClasse` | `/professor/notas-da-classe` | Notas da classe |
| `ROUTES.prof.caderno` | `/professor/caderno` | Caderno professor |
| `ROUTES.prof.gabarito` | `/professor/gabarito` | Gabaritos |
| `ROUTES.prof.redacao` | `/professor/redacao` | Lista de redações |
| `ROUTES.prof.redacaoShow(id)` | `/professor/redacao/:id` | Correção de redação |
| `ROUTES.prof.alunos` | `/professor/alunos` | Lista de alunos |
| `ROUTES.prof.alunoPerfil(id)` | `/professor/alunos/:id` | Perfil do aluno |

### Rotas Aluno (`/aluno`)
| Rota | Path | Descrição |
|------|------|-----------|
| `ROUTES.aluno.base` | `/aluno` | Base aluno (redirect para resumo) |
| `ROUTES.aluno.resumo` | `/aluno/resumo` | Dashboard aluno |
| `ROUTES.aluno.notas` | `/aluno/notas` | Notas do aluno |
| `ROUTES.aluno.recados` | `/aluno/recados` | Recados |
| `ROUTES.aluno.redacao` | `/aluno/redacao` | Enviar redação |
| `ROUTES.aluno.redacoes` | `/aluno/redacoes` | Lista de redações |
| `ROUTES.aluno.caderno` | `/aluno/caderno` | Caderno aluno |
| `ROUTES.aluno.gabaritos` | `/aluno/gabaritos` | Gabaritos |

### Rotas Especiais
| Rota | Path | Descrição |
|------|------|-----------|
| `ROUTES.notFound` | `*` | 404 - Catch-all |

## 🛠️ Scripts e Comandos

### Desenvolvimento
```bash
# Desenvolvimento completo (raiz)
npm run dev

# Apenas frontend
cd frontend && npm run dev

# Apenas backend
cd backend && npm run dev
```

### Build e Deploy
```bash
# Build completo (frontend + PDF viewer)
npm run build

# Build apenas frontend
cd frontend && npm run build

# Build PDF viewer separadamente
cd frontend/apps/pdf-viewer && npm run build
```

### Qualidade de Código
```bash
# Lint
npm run lint --prefix frontend

# Testes
npm test --prefix frontend
npm test --prefix backend

# Verificação completa (lint + test + e2e)
npm run check-all --prefix frontend
```

### Scripts Específicos
```bash
# Verificar imports de PDF
npm run check:pdf-imports --prefix frontend

# Verificar configuração Vercel
npm run vercel:preflight --prefix frontend

# E2E tests
npm run e2e --prefix frontend
npm run e2e:headed --prefix frontend
```

## Production

1. Build the frontend:
   ```bash
   npm run build
   ```
2. Certifique-se de que as variáveis de ambiente estejam definidas (veja o exemplo de `.env`), incluindo `VITE_API_URL` (URL do backend) e `APP_DOMAIN` (domínio público do app).
3. Execute o servidor Node em modo produção para servir `frontend/dist`:
   ```bash
   NODE_ENV=production node backend/server.js
   ```
   O backend servirá os arquivos estáticos da pasta `frontend/dist` na porta definida por `PORT` (padrão `5050`).

   ### Anotador de PDF (rich annotations)

   - Controlado pelo flag `VITE_USE_RICH_ANNOS` no frontend. Quando habilitado, o workspace de correção usa o novo anotador com ferramentas de highlight, caneta, caixa, riscado e comentário, além de desfazer/refazer e autosave.
   - O backend persiste no campo `richAnnotations` do modelo `Essay` e o PDF de correção inclui um resumo por página.
   - Carga é virtualizada quando `VITE_VIRT_PDF=true` para melhor performance em PDFs longos. Ajuste o buffer com `VITE_VIRT_BUFFER`.
   - Detecção de PDF mais robusta: além de verificar `.pdf` no link, o frontend usa `originalMimeType` vindo do backend (salvo no momento do upload ou via HEAD best-effort) para decidir o viewer inline. Assim, URLs sem extensão também abrem no editor.

## Hosting Tips

- **Backend**: Platforms like Heroku or Render work well for hosting the Node.js server.
- **Frontend**: Deploy the built frontend on services such as Vercel. In the Vercel dashboard, set the **Root Directory** to `frontend`, use `npm install --legacy-peer-deps` as the install command and `npm run build` to build, with the output directory `dist`.
- **DNS & CORS**: When frontend and backend are hosted separately, configure DNS so the frontend uses your `APP_DOMAIN` and ensure the backend allows that origin in its CORS settings.


## Deployment Checklist

Refer to [DEPLOY_CHECKLIST.md](./DEPLOY_CHECKLIST.md) for steps to validate navigation, gabarito handling, redação workflows, notifications, and branding before deploying to staging or production.
