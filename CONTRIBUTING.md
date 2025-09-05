# Guia de Contribuição

Este documento estabelece padrões e diretrizes para contribuições no projeto Site-Professor-Yago, garantindo que mudanças não quebrem rotas, visual ou fluxos existentes.

## 📋 Padrões de Commit

### Formato
```
tipo(escopo): descrição breve

Descrição detalhada (opcional)

Closes #issue
```

### Tipos Permitidos
- `feat`: Nova funcionalidade
- `fix`: Correção de bug
- `docs`: Documentação
- `style`: Formatação, sem mudança de código
- `refactor`: Refatoração sem mudança de funcionalidade
- `test`: Adição ou correção de testes
- `chore`: Mudanças em build, dependências, etc.

### Exemplos
```bash
feat(auth): adicionar login com Google
fix(pdf): corrigir renderização de anotações
docs(readme): atualizar instruções de instalação
refactor(routes): simplificar validação de rotas
```

## 🚫 Do's and Don'ts

### ✅ DO - O que fazer

#### Rotas (`src/routes.ts`)
- ✅ Use sempre `ROUTES.nome` em vez de strings hardcoded
- ✅ Adicione validação com `assertRoute()` para novas rotas
- ✅ Mantenha estrutura hierárquica consistente
- ✅ Use paths relativos para rotas aninhadas
- ✅ Teste navegação após mudanças

#### API (`src/services/api.ts`)
- ✅ Mantenha interceptors de request/response
- ✅ Preserve tratamento de erros centralizado
- ✅ Use `api` instance em vez de axios direto
- ✅ Mantenha configuração de timeout e retry

#### PDF Viewer (`apps/pdf-viewer/`)
- ✅ Não altere o path do worker (`/viewer/pdf.worker.mjs`)
- ✅ Mantenha compatibilidade com postMessage
- ✅ Preserve estrutura de build independente
- ✅ Teste integração com iframe

#### Layouts (`src/layouts/`, `src/components/AppShell.tsx`)
- ✅ Mantenha estrutura de navegação existente
- ✅ Preserve responsividade mobile
- ✅ Mantenha acessibilidade (ARIA labels)
- ✅ Teste em diferentes tamanhos de tela

### ❌ DON'T - O que NÃO fazer

#### Rotas
- ❌ **NUNCA** renomeie chaves existentes em `ROUTES`
- ❌ **NUNCA** use paths absolutos em rotas aninhadas
- ❌ **NUNCA** remova validações de `assertRoute()`
- ❌ **NUNCA** quebre compatibilidade com URLs existentes

#### API
- ❌ **NUNCA** mova `src/services/api.ts` para outro local
- ❌ **NUNCA** remova interceptors sem substituir funcionalidade
- ❌ **NUNCA** altere estrutura de resposta sem versionamento
- ❌ **NUNCA** quebre autenticação JWT

#### PDF Viewer
- ❌ **NUNCA** altere o path do worker PDF
- ❌ **NUNCA** quebre comunicação postMessage
- ❌ **NUNCA** remova marcadores de performance
- ❌ **NUNCA** altere estrutura de build

#### Layouts e Visual
- ❌ **NUNCA** quebre navegação existente
- ❌ **NUNCA** remova responsividade
- ❌ **NUNCA** altere cores/estilos sem justificativa
- ❌ **NUNCA** quebre acessibilidade

## 🔍 Checklist de Pull Request

### Antes de Abrir PR
- [ ] **Smoke Test**: `npm run check-all` passou
- [ ] **Lint**: `npm run lint` sem erros
- [ ] **Testes**: `npm test` passou
- [ ] **E2E**: `npm run e2e` passou (headless)
- [ ] **Build**: `npm run build` funcionou
- [ ] **Rotas**: Validação de rotas passou

### Verificações Específicas
- [ ] **Rotas**: Não adicionou path absoluto em rotas aninhadas
- [ ] **ROUTES**: Manteve chaves existentes intactas
- [ ] **API**: Não moveu `api.ts` ou quebrou interceptors
- [ ] **PDF**: Não alterou worker path ou postMessage
- [ ] **Layout**: Manteve navegação e responsividade
- [ ] **Visual**: Não quebrou design existente

### Testes Obrigatórios
- [ ] **Navegação**: Todas as rotas funcionam
- [ ] **Login**: Fluxo de autenticação intacto
- [ ] **PDF**: Viewer carrega e funciona
- [ ] **Mobile**: Responsividade mantida
- [ ] **Acessibilidade**: ARIA labels preservados

## 🧪 Como Testar

### Testes Automatizados
```bash
# Verificação completa
npm run check-all

# Testes específicos
npm run lint
npm test
npm run e2e
```

### Testes Manuais
1. **Login Professor**:
   - Acesse `/login-professor`
   - Faça login com credenciais válidas
   - Verifique redirecionamento para `/professor/resumo`

2. **Login Aluno**:
   - Acesse `/login-aluno`
   - Faça login com credenciais válidas
   - Verifique redirecionamento para `/aluno/resumo`

3. **Navegação**:
   - Teste todos os links do menu
   - Verifique breadcrumbs
   - Teste botões de voltar

4. **PDF Viewer**:
   - Acesse uma redação para correção
   - Verifique se PDF carrega
   - Teste anotações e ferramentas

5. **Responsividade**:
   - Teste em mobile (375px)
   - Teste em tablet (768px)
   - Teste em desktop (1200px+)

## 🚨 Validações Automáticas

### Script `check-all`
O comando `npm run check-all` executa:
1. **Lint**: Verificação de código
2. **Testes**: Testes unitários
3. **E2E**: Testes end-to-end (headless)
4. **Validação de Rotas**: Verificação de invariantes

### Validador de Rotas
O sistema valida automaticamente:
- Paths relativos em rotas aninhadas
- Ausência de duplicatas
- Formato correto de paths
- Presença de catch-all route

## 🔧 Configuração de Desenvolvimento

### Pre-commit Hooks
O projeto usa Husky para executar:
- Lint-staged (lint + format)
- Validação de rotas
- Verificação de imports PDF

### VS Code
Recomendado usar:
- ESLint extension
- Prettier extension
- Auto-save com format on save

## 📚 Recursos Adicionais

### Documentação
- [README.md](./README.md) - Visão geral do projeto
- [docs/AI_GUIDE.md](./docs/AI_GUIDE.md) - Guia para IA
- [USER_GUIDE.md](./USER_GUIDE.md) - Guia do usuário

### Scripts Úteis
```bash
# Verificar imports problemáticos
npm run check:pdf-imports

# Verificar configuração Vercel
npm run vercel:preflight

# Debug de rotas
npm run validate-routes
```

## 🤝 Processo de Review

### Para Reviewers
1. Verifique se checklist foi seguido
2. Teste funcionalidades afetadas
3. Verifique se não quebrou fluxos existentes
4. Confirme que testes passaram

### Para Contributors
1. Siga padrões de commit
2. Execute checklist completo
3. Documente mudanças significativas
4. Responda feedback de review

## 🆘 Problemas Comuns

### Build Falha
- Verifique se todas as dependências estão instaladas
- Execute `npm run check:pdf-imports`
- Verifique se não há imports estáticos de PDF

### Rotas Quebradas
- Execute `npm run validate-routes`
- Verifique se usou `ROUTES.nome` em vez de strings
- Confirme que paths são relativos em rotas aninhadas

### PDF Viewer Não Funciona
- Verifique se worker está no path correto
- Confirme que postMessage está funcionando
- Teste em modo incógnito

### Testes Falham
- Execute `npm test -- --verbose` para detalhes
- Verifique se mocks estão atualizados
- Confirme que não há side effects entre testes

---

**Lembre-se**: O objetivo é manter o sistema estável e funcional. Quando em dúvida, prefira mudanças incrementais e bem testadas.
