# Guia para IA - Site-Professor-Yago

Este documento fornece orientações específicas para assistentes de IA trabalharem no projeto, evitando quebras e mantendo a integridade do sistema.

## 🚨 Regras Críticas - NUNCA VIOLAR

### 1. Rotas (`src/routes.ts`)
- ❌ **NUNCA** renomeie chaves existentes em `ROUTES`
- ❌ **NUNCA** mova o arquivo `src/routes.ts`
- ❌ **NUNCA** altere paths existentes sem migração
- ❌ **NUNCA** use paths absolutos em rotas aninhadas
- ❌ **NUNCA** remova validações `assertRoute()`

### 2. API (`src/services/api.ts`)
- ❌ **NUNCA** mova o arquivo `src/services/api.ts`
- ❌ **NUNCA** remova interceptors sem substituir funcionalidade
- ❌ **NUNCA** altere estrutura de autenticação JWT
- ❌ **NUNCA** quebre tratamento de erros centralizado

### 3. PDF Viewer (`apps/pdf-viewer/`)
- ❌ **NUNCA** altere o path do worker: `/viewer/pdf.worker.mjs`
- ❌ **NUNCA** quebre comunicação postMessage
- ❌ **NUNCA** mova arquivos do viewer para outro local
- ❌ **NUNCA** altere estrutura de build independente

### 4. Layouts e Navegação
- ❌ **NUNCA** quebre estrutura de navegação existente
- ❌ **NUNCA** remova responsividade mobile
- ❌ **NUNCA** altere cores/estilos sem justificativa clara
- ❌ **NUNCA** quebre acessibilidade (ARIA labels)

## 🎯 Sequência de Prompts Recomendada

### Para Novos Desenvolvedores/IA
1. **Leia primeiro**: README.md, CONTRIBUTING.md, este guia
2. **Entenda a arquitetura**: Frontend Vite + Backend Node + PDF Viewer
3. **Estude as rotas**: `src/routes.ts` e como são usadas
4. **Compreenda os fluxos**: Login, dashboard, correção, visualização
5. **Teste antes de modificar**: `npm run check-all`

### Para Modificações Específicas

#### Adicionar Nova Rota
1. Adicione em `src/routes.ts` com `assertRoute()`
2. Adicione no `App.tsx` com Suspense apropriado
3. Adicione no menu de navegação se necessário
4. Teste navegação completa
5. Execute `npm run validate-routes`

#### Modificar API
1. Mantenha `src/services/api.ts` no local
2. Preserve interceptors existentes
3. Adicione novos endpoints sem quebrar existentes
4. Teste autenticação e tratamento de erros
5. Execute `npm run check-all`

#### Alterar PDF Viewer
1. Mantenha worker path: `/viewer/pdf.worker.mjs`
2. Preserve comunicação postMessage
3. Teste integração com iframe
4. Mantenha marcadores de performance
5. Execute build independente

## 🔍 Padrões de Análise

### Antes de Qualquer Mudança
1. **Leia o código existente** completamente
2. **Identifique dependências** e impactos
3. **Verifique testes** relacionados
4. **Execute validações** (`npm run check-all`)
5. **Planeje migração** se necessário

### Durante Desenvolvimento
1. **Mantenha compatibilidade** com código existente
2. **Preserve funcionalidades** não relacionadas
3. **Adicione testes** para novas funcionalidades
4. **Documente mudanças** significativas
5. **Teste incrementalmente** cada mudança

### Após Desenvolvimento
1. **Execute checklist completo** do CONTRIBUTING.md
2. **Teste fluxos críticos** manualmente
3. **Verifique responsividade** em diferentes telas
4. **Confirme acessibilidade** básica
5. **Execute validações automáticas**

## 🛠️ Ferramentas e Scripts

### Validação Automática
```bash
# Verificação completa
npm run check-all

# Validação específica de rotas
npm run validate-routes

# Verificação de imports PDF
npm run check:pdf-imports
```

### Debug e Desenvolvimento
```bash
# Desenvolvimento com hot reload
npm run dev

# Build para testar produção
npm run build

# Testes específicos
npm test -- --testNamePattern="nome_do_teste"
```

## 📚 Estrutura do Projeto

### Frontend (`frontend/`)
```
src/
├── components/          # Componentes reutilizáveis
├── hooks/              # Hooks customizados
├── layouts/            # Layouts de página
├── pages/              # Páginas da aplicação
├── routes/             # Configuração de rotas
├── services/           # Serviços e API
├── lib/                # Utilitários e cache
└── __tests__/          # Testes unitários
```

### PDF Viewer (`frontend/apps/pdf-viewer/`)
```
src/
├── Viewer.tsx          # Componente principal
├── index.tsx           # Entry point
└── types.ts            # Tipos TypeScript
```

### Backend (`backend/`)
```
routes/                 # Rotas da API
models/                 # Modelos do banco
middleware/             # Middlewares
```

## 🔄 Fluxos Críticos

### 1. Autenticação
- Login professor: `/login-professor` → JWT → `/professor/resumo`
- Login aluno: `/login-aluno` → JWT → `/aluno/resumo`
- Logout: Limpa JWT → Redireciona para login

### 2. Correção de Redação
- Lista: `/professor/redacao` → Seleciona redação
- Correção: `/professor/redacao/:id` → PDF viewer → Anotações
- Salvar: PostMessage → Backend → Atualizar lista

### 3. Upload de Redação
- Modal: Nova redação → Upload/URL → Validação
- Progress: Barra de progresso → Cancelamento
- Sucesso: Toast → Reload lista → Highlight

### 4. Dashboard
- Professor: Turmas → Redações → Notas
- Aluno: Redações → Notas → Conteúdo

## ⚠️ Pontos de Atenção

### Performance
- Cache stale-while-revalidate para listas
- Lazy loading de componentes pesados
- Virtualização de PDFs longos
- Web Vitals para monitoramento

### Segurança
- JWT com expiração
- Validação de uploads
- Sanitização de inputs
- CORS configurado

### Acessibilidade
- ARIA labels em elementos interativos
- Navegação por teclado
- Contraste adequado
- Textos alternativos

## 🚀 Boas Práticas

### Código
- Use TypeScript para type safety
- Mantenha componentes pequenos e focados
- Use hooks customizados para lógica reutilizável
- Prefira composição sobre herança

### Testes
- Teste comportamento, não implementação
- Use mocks para dependências externas
- Mantenha testes independentes
- Cubra casos de erro e edge cases

### Performance
- Use React.memo para componentes pesados
- Implemente lazy loading quando apropriado
- Monitore bundle size
- Use Web Vitals para métricas

### Manutenibilidade
- Documente decisões arquiteturais
- Mantenha consistência de padrões
- Refatore gradualmente
- Preserve funcionalidades existentes

## 🆘 Resolução de Problemas

### Build Falha
1. Verifique imports de PDF: `npm run check:pdf-imports`
2. Execute lint: `npm run lint`
3. Verifique TypeScript: `npm run type-check`
4. Limpe cache: `rm -rf node_modules && npm install`

### Rotas Quebradas
1. Execute validação: `npm run validate-routes`
2. Verifique se usou `ROUTES.nome`
3. Confirme paths relativos em aninhadas
4. Teste navegação manualmente

### PDF Viewer Não Funciona
1. Verifique worker path: `/viewer/pdf.worker.mjs`
2. Confirme postMessage funcionando
3. Teste em modo incógnito
4. Verifique console para erros

### Testes Falham
1. Execute com verbose: `npm test -- --verbose`
2. Verifique mocks atualizados
3. Confirme isolamento entre testes
4. Verifique setup de ambiente

---

**Lembre-se**: O objetivo é manter o sistema estável e funcional. Quando em dúvida, prefira mudanças incrementais, bem testadas e documentadas.

---

## 🤖 Assistente de Correção (IA) – Preview

### Flag de Ativação
Defina `ENABLE_AI_CORRECTION=true` para habilitar a rota de sugestão.

### Rota
`POST /ai/correction-suggestion`

Body (exemplo mínimo):
```json
{ "essayId": "<id_da_redacao>" }
```
Campos opcionais: `type`, `themeText`, `rawText` (≤ 12.000 chars), `currentScores`.

### Resposta (mock)
```json
{
	"mode": "mock",
	"disclaimer": "Sugestão automática (modo demonstração). Revise antes de aplicar.",
	"sections": {
		"generalFeedback": "...",
		"competencies": [ { "id":"c1", "suggestedScore":160, ... } ],
		"improvements": ["..."]
	},
	"metadata": { "generationMs": 42, "hash": "abcd1234" }
}
```

### Limites
- Rate limit dedicado: 10 requisições / 5 min por professor.
- `rawText` acima de 12.000 caracteres retorna 413.
- Texto é sanitizado (remoção de caracteres de controle).

### Frontend
Botão “Sugestão IA” na página de correção abre painel com:
- Aplicar Feedback Geral
- Aplicar Notas (ENEM/PAS)
- Campo opcional para colar texto bruto

### Futuro
- Provider real configurável (`AI_PROVIDER`)
- OCR/extração automática de texto
- Persistência de histórico de sugestões (opt-in)

---
