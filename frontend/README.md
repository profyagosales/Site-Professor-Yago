# Site Professor Yago - Frontend

Sistema de gestão educacional para correção de redações e gerenciamento de turmas, desenvolvido com React + TypeScript + Vite.

## 🏗️ Arquitetura

### Stack Tecnológica
- **Frontend**: React 18 + TypeScript + Vite (SPA)
- **Backend**: Node.js + Express + MongoDB (Render)
- **Deploy**: Vercel (Frontend) + Render (Backend)
- **Autenticação**: JWT + localStorage
- **PDF**: react-pdf + react-pdf-highlighter
- **Styling**: Tailwind CSS
- **Linting**: ESLint + Prettier + Husky

### Fluxo de Dados
```
[Vercel SPA] ←→ [Render API] ←→ [MongoDB]
     ↓
[PDF Viewer] ←→ [Cloudinary/Upload]
```

### Estrutura de Rotas
- **Professor**: `/professor/*` - Dashboard, turmas, correção de redações
- **Aluno**: `/aluno/*` - Dashboard, envio de redações, visualização de notas
- **Auth**: `/login-professor`, `/login-aluno` - Autenticação

## 🚀 Como Rodar Localmente

### Pré-requisitos
- Node.js 18+
- npm ou yarn
- MongoDB (local ou Atlas)

### 1. Instalar Dependências
```bash
# Na raiz do projeto
npm install --prefix frontend
npm install --prefix backend
```

### 2. Configurar Variáveis de Ambiente
Crie um arquivo `.env` na raiz do projeto:

```env
# Backend
MONGODB_URI=mongodb://localhost:27017/site-professor-yago
JWT_SECRET=sua_chave_ultrasecreta
SMTP_HOST=smtp.exemplo.com
SMTP_PORT=587
SMTP_USER=usuario
SMTP_PASS=senha
SMTP_FROM=no-reply@exemplo.com
APP_DOMAIN=http://localhost:5173

# Frontend
VITE_API_BASE_URL=http://localhost:5050
VITE_API_PREFIX=/api
VITE_USE_RICH_ANNOS=true
VITE_VIRT_PDF=true
VITE_VIRT_BUFFER=2
```

### 3. Executar Servidores
```bash
# Na raiz do projeto
npm run dev
```

- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:5050

## 🔨 Build e Deploy

### Build Local
```bash
# Frontend
cd frontend
npm run build

# Backend (se necessário)
cd backend
npm run build
```

### Deploy no Vercel
1. Conecte o repositório ao Vercel
2. Configure as variáveis de ambiente
3. Deploy automático via Git

### Deploy no Render
1. Conecte o repositório ao Render
2. Configure as variáveis de ambiente
3. Deploy automático via Git

## 📋 Tabela de Rotas

### Rotas de Autenticação
| Rota | Descrição | Acesso |
|------|-----------|--------|
| `/` | Home/Landing | Público |
| `/login-professor` | Login Professor | Público |
| `/login-aluno` | Login Aluno | Público |

### Rotas do Professor
| Rota | Descrição | Componente |
|------|-----------|------------|
| `/professor` | Dashboard Principal | DashboardProfessor |
| `/professor/resumo` | Resumo Geral | DashboardProfessor |
| `/professor/turmas` | Gerenciar Turmas | Turmas |
| `/professor/turmas/:id/alunos` | Alunos da Turma | TurmaAlunos |
| `/professor/notas-da-classe` | Notas da Classe | NotasClasse |
| `/professor/caderno` | Caderno de Conteúdos | Caderno |
| `/professor/gabarito` | Gerenciar Gabaritos | Gabarito |
| `/professor/redacao` | Lista de Redações | RedacaoProfessorPage |
| `/professor/redacao/:id` | Workspace de Correção | GradeWorkspace |
| `/professor/alunos` | Lista de Alunos | ListaAlunos |
| `/professor/alunos/:id` | Perfil do Aluno | PerfilAluno |

### Rotas do Aluno
| Rota | Descrição | Componente |
|------|-----------|------------|
| `/aluno` | Dashboard Principal | DashboardAluno |
| `/aluno/resumo` | Resumo Geral | DashboardAluno |
| `/aluno/notas` | Visualizar Notas | Notas |
| `/aluno/recados` | Recados (Em desenvolvimento) | - |
| `/aluno/redacao` | Enviar Redação | Redacoes |
| `/aluno/caderno` | Caderno de Conteúdos | Caderno |
| `/aluno/gabaritos` | Visualizar Gabaritos | Gabarito |
| `/aluno/redacoes` | Minhas Redações | Redacoes |

## 🗺️ Mapa das Páginas

```
/
├── /login-professor
├── /login-aluno
├── /professor/
│   ├── resumo (Dashboard)
│   ├── turmas
│   │   └── :id/alunos
│   ├── notas-da-classe
│   ├── caderno
│   ├── gabarito
│   ├── redacao
│   │   └── :id (Workspace)
│   └── alunos
│       └── :id (Perfil)
└── /aluno/
    ├── resumo (Dashboard)
    ├── notas
    ├── recados
    ├── redacao
    ├── caderno
    ├── gabaritos
    └── redacoes
```

## 🔧 Funcionalidades Principais

### 1. Sistema de Autenticação
- **RequireAuth**: Componente que protege rotas baseado no tipo de usuário
- **AuthContext**: Contexto global para gerenciar estado de autenticação
- **Token Management**: JWT armazenado em localStorage com validação automática

### 2. Viewer de PDF
- **PdfHighlighter**: Visualizador de PDF com anotações
- **Anotações Ricas**: Highlight, caneta, caixa, riscado e comentários
- **Virtualização**: Performance otimizada para PDFs longos
- **Autosave**: Salvamento automático das anotações

### 3. Upload de Arquivos
- **Cloudinary**: Upload de PDFs para correção
- **Validação**: Verificação de tipo MIME e tamanho
- **Preview**: Visualização antes do envio

### 4. Cliente API
- **Axios**: Cliente HTTP com interceptors
- **Retry Logic**: Tentativas automáticas em caso de falha
- **Timeout**: 15 segundos de timeout
- **AbortController**: Cancelamento de requests

## 🌍 Variáveis de Ambiente

### Frontend (VITE_*)
| Variável | Descrição | Padrão |
|----------|-----------|--------|
| `VITE_API_BASE_URL` | URL base da API | `http://localhost:5050` |
| `VITE_API_PREFIX` | Prefixo da API | `/api` |
| `VITE_USE_RICH_ANNOS` | Habilitar anotador rico | `true` |
| `VITE_VIRT_PDF` | Habilitar virtualização PDF | `true` |
| `VITE_VIRT_BUFFER` | Buffer de virtualização | `2` |

### Backend
| Variável | Descrição | Obrigatória |
|----------|-----------|-------------|
| `MONGODB_URI` | String de conexão MongoDB | ✅ |
| `JWT_SECRET` | Chave secreta JWT | ✅ |
| `SMTP_HOST` | Servidor SMTP | ✅ |
| `SMTP_USER` | Usuário SMTP | ✅ |
| `SMTP_PASS` | Senha SMTP | ✅ |
| `APP_DOMAIN` | Domínio público | ✅ |

## 📚 Boas Práticas

### 1. Rotas
```typescript
// ✅ CORRETO - Use ROUTES constants
import { ROUTES } from '@/routes';
navigate(ROUTES.prof.redacao);

// ❌ ERRADO - Não hardcode rotas
navigate('/professor/redacao');
```

### 2. API Calls
```typescript
// ✅ CORRETO - Use o cliente API configurado
import { api, setAuthToken } from '@/services/api';
setAuthToken(token);
const response = await api.get('/essays');

// ❌ ERRADO - Não use axios diretamente
import axios from 'axios';
const response = await axios.get('/api/essays');
```

### 3. Autenticação
```typescript
// ✅ CORRETO - Use RequireAuth para proteger rotas
<Route path="/professor" element={<RequireAuth userType="professor" />}>
  <Route index element={<DashboardProfessor />} />
</Route>

// ❌ ERRADO - Não verifique autenticação manualmente
if (!user) return <Navigate to="/login" />;
```

### 4. Imports
```typescript
// ✅ CORRETO - Use aliases @/
import { ROUTES } from '@/routes';
import { useAuth } from '@/store/AuthContext';

// ❌ ERRADO - Não use caminhos relativos
import { ROUTES } from '../../../routes';
import { useAuth } from '../../../store/AuthContext';
```

### 5. Componentes
```typescript
// ✅ CORRETO - Use TypeScript interfaces
interface Props {
  title: string;
  onClose: () => void;
}

// ❌ ERRADO - Não use any
function Component(props: any) {
  // ...
}
```

## 🧪 Scripts Disponíveis

```bash
# Desenvolvimento
npm run dev              # Servidor de desenvolvimento
npm run preview          # Preview do build

# Build
npm run build            # Build de produção
npm run vercel-build     # Build para Vercel

# Qualidade de Código
npm run lint             # ESLint
npm run lint:fix         # ESLint com correção automática
npm run format           # Prettier
npm run format:check     # Verificar formatação
npm run type-check       # TypeScript check

# Testes
npm run test             # Executar testes
npm run test:watch       # Testes em modo watch
npm run test:coverage    # Testes com cobertura

# Utilitários
npm run check:pdf-imports  # Verificar imports de PDF
npm run vercel:preflight   # Verificar configuração Vercel
```

## 🐛 Troubleshooting

### Problemas Comuns

1. **Erro de CORS**
   - Verifique se `APP_DOMAIN` está configurado corretamente
   - Confirme se o backend está rodando

2. **PDF não carrega**
   - Verifique se `pdf.worker.mjs` está na pasta `public/`
   - Execute `npm run postinstall`

3. **Build falha**
   - Execute `npm run lint:fix` para corrigir problemas de lint
   - Verifique se todas as dependências estão instaladas

4. **Rotas não funcionam**
   - Verifique se está usando `ROUTES` constants
   - Confirme se o `vercel.json` está configurado corretamente

## 📖 Documentação Adicional

- [Guia do Usuário](../USER_GUIDE.md) - Fluxos de uso da aplicação
- [Checklist de Deploy](../DEPLOY_CHECKLIST.md) - Validações antes do deploy
- [Configuração do Backend](../backend/README.md) - Documentação da API

## 🤝 Contribuição

1. Siga as boas práticas documentadas
2. Execute `npm run lint` antes de commitar
3. Teste localmente antes de fazer push
4. Use commits descritivos

---

**Desenvolvido com ❤️ para facilitar a correção de redações e gestão educacional**