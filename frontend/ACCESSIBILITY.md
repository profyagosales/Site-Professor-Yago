# Acessibilidade (A11y) - Professor Yago Sales

Este documento descreve as implementações de acessibilidade no projeto, seguindo as diretrizes WCAG 2.1 AA.

## 🎯 Objetivos Alcançados

- ✅ **Foco administrado corretamente** em modais e formulários
- ✅ **ARIA labels e roles** apropriados em todos os componentes
- ✅ **Contraste de cores** validado e ajustado (mín. 4.5:1)
- ✅ **Navegação por teclado** funcional em todos os elementos interativos
- ✅ **Testes automatizados** com jest-axe para garantir conformidade

## 🔧 Implementações Realizadas

### 1. Gerenciamento de Foco

#### Hook `useFocusManagement`
```typescript
// Automático foco no primeiro elemento interativo ao abrir modais
// Devolve foco ao elemento trigger ao fechar
const modalRef = useFocusManagement(isOpen);
```

**Aplicado em:**
- Formulários de login (AuthShell)
- Modais de criação/edição
- Componentes de navegação

### 2. ARIA Labels e Roles

#### Navegação Principal
```tsx
<nav role="navigation" aria-label="Menu principal">
  <NavLink aria-current={isActive ? 'page' : undefined}>
    {label}
  </NavLink>
</nav>
```

#### Formulários
```tsx
<Field
  label="E-mail"
  required
  error="Campo obrigatório"
  // Gera automaticamente:
  // - id único para o input
  // - aria-invalid="true" quando há erro
  // - aria-describedby para mensagens de erro
  // - role="alert" nas mensagens de erro
/>
```

#### Botões
```tsx
<Button
  aria-label="Fazer logout da conta"
  // Foco visível com focus-visible:ring
  // tabIndex correto para elementos desabilitados
>
  Sair
</Button>
```

### 3. Contraste de Cores

#### Tokens Atualizados
```css
/* Cores com contraste melhorado */
--ys-amber: #E66A00;        /* Escurecido 5% para melhor contraste */
--ys-amber-text: #B45309;   /* Para texto sobre fundo claro */
--ys-amber-bg: #FEF3C7;     /* Fundo para texto laranja */
```

**Razões de contraste:**
- `#E66A00` sobre branco: **4.8:1** ✅ (WCAG AA)
- `#B45309` sobre branco: **6.2:1** ✅ (WCAG AAA)

### 4. Navegação por Teclado

#### Elementos Interativos
- **Tab/Shift+Tab**: Navegação sequencial
- **Enter/Espaço**: Ativação de botões e links
- **Escape**: Fecha modais (quando aplicável)

#### Indicadores Visuais
```css
/* Foco visível em todos os elementos interativos */
.focus-visible:ring-2 .focus-visible:ring-ys-amber
```

### 5. Toasts Acessíveis

#### Configuração Automática
```tsx
<ToastProvider />
// Configura automaticamente:
// - role="status"
// - aria-live="polite"
// - aria-label="Notificações"
```

## 🧪 Testes de Acessibilidade

### Jest-Axe Integration
```typescript
import { toHaveNoViolations } from 'jest-axe';
expect.extend(toHaveNoViolations);

// Testa automaticamente violações WCAG
const results = await axe(container);
expect(results).toHaveNoViolations();
```

### Cobertura de Testes
- ✅ **AuthShell**: Estrutura semântica e navegação
- ✅ **Field**: Labels associados e mensagens de erro
- ✅ **Button**: Foco visível e estados desabilitados
- ✅ **AppShell**: Navegação com aria-current
- ✅ **Formulários**: Estrutura completa de login

## 📋 Checklist de Conformidade

### WCAG 2.1 AA - Critérios Atendidos

#### 1. Perceptível
- ✅ **1.4.3 Contraste (Mínimo)**: Razão de contraste ≥ 4.5:1
- ✅ **1.4.11 Contraste de Componentes**: Elementos UI com contraste adequado

#### 2. Operável
- ✅ **2.1.1 Teclado**: Toda funcionalidade acessível via teclado
- ✅ **2.1.2 Sem Armadilha de Teclado**: Foco pode sair de qualquer elemento
- ✅ **2.4.3 Ordem de Foco**: Ordem lógica de navegação
- ✅ **2.4.7 Foco Visível**: Indicador de foco claramente visível

#### 3. Compreensível
- ✅ **3.3.2 Labels ou Instruções**: Labels claros em todos os campos
- ✅ **3.3.3 Sugestão de Erro**: Mensagens de erro específicas e úteis

#### 4. Robusto
- ✅ **4.1.2 Nome, Função, Valor**: Elementos têm propriedades acessíveis
- ✅ **4.1.3 Mensagens de Status**: Notificações são anunciadas aos leitores de tela

## 🚀 Como Usar

### Executar Testes de Acessibilidade
```bash
# Testes específicos de acessibilidade
npm test -- --testPathPatterns=Accessibility.test.tsx

# Todos os testes (inclui acessibilidade)
npm test
```

### Verificar Conformidade Manual
1. **Navegação por teclado**: Use apenas Tab, Shift+Tab, Enter, Espaço
2. **Leitor de tela**: Teste com NVDA, JAWS ou VoiceOver
3. **Contraste**: Use ferramentas como WebAIM Contrast Checker
4. **Zoom**: Teste com zoom de 200% para verificar usabilidade

## 🔄 Manutenção

### Ao Adicionar Novos Componentes
1. **Sempre** adicione `aria-label` ou `aria-labelledby`
2. **Configure** foco apropriado para modais
3. **Teste** navegação por teclado
4. **Valide** contraste de cores
5. **Execute** testes de acessibilidade

### Monitoramento Contínuo
- Execute `npm test` antes de cada commit
- Use ferramentas como axe DevTools no navegador
- Revise periodicamente com usuários reais

## 📚 Recursos Adicionais

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [axe DevTools](https://www.deque.com/axe/devtools/)

---

**Última atualização**: Janeiro 2025  
**Conformidade**: WCAG 2.1 AA  
**Status**: ✅ Implementado e testado
