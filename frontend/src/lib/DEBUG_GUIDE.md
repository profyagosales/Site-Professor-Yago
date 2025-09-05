# Guia de Debug - Instrumentação de Vazamentos

Este guia explica como usar o sistema de instrumentação `net-debug.ts` para identificar vazamentos de memória e efeitos que disparam indefinidamente.

## 🚀 Como Usar

### 1. Abrir o Console do Navegador
- Pressione `F12` ou `Ctrl+Shift+I` (Windows/Linux) / `Cmd+Option+I` (Mac)
- Vá para a aba "Console"

### 2. Navegar pelo Site
- Acesse diferentes páginas do site
- Interaja com os componentes
- Observe os logs no console

### 3. Interpretar os Logs

#### ✅ Logs Normais (Esperados)
```
[count] useSession/validation-interval: 1
[interval:start] useSession/validation id=123 ms=30000
[count] DashboardProfessor/load-data: 1
[count] LoginProfessor/redirect-check: 1
```

#### ⚠️ Sinais de Vazamento
```
[count] useSession/validation-interval: 5  // Múltiplas execuções
[count] DashboardProfessor/load-data: 10   // Muitas execuções
[interval:start] useSession/validation id=123 ms=30000
[interval:start] useSession/validation id=124 ms=30000  // Múltiplos intervals
[interval:start] useSession/validation id=125 ms=30000
```

#### 🔴 Vazamentos Críticos
```
[count] useSession/validation-interval: 50+  // Executando constantemente
[interval:start] useSession/validation id=123 ms=30000
[interval:start] useSession/validation id=124 ms=30000
[interval:start] useSession/validation id=125 ms=30000
// Sem interval:clear correspondente
```

## 📊 Tipos de Logs

### `[count]` - Contadores de Execução
- **O que é**: Conta quantas vezes um efeito/função é executado
- **Normal**: Deve incrementar apenas 1 vez por montagem real
- **Problema**: Incrementa múltiplas vezes sem remontagem

### `[interval:start]` - Criação de Intervals
- **O que é**: Log quando um `setInterval` é criado
- **Formato**: `[interval:start] <label> id=<id> ms=<ms>`
- **Normal**: Deve ter um `[interval:clear]` correspondente

### `[interval:clear]` - Limpeza de Intervals
- **O que é**: Log quando um `setInterval` é limpo
- **Formato**: `[interval:clear] <label> id=<id>`
- **Normal**: Deve aparecer quando o componente é desmontado

### `[once]` - Logs Únicos
- **O que é**: Log que aparece apenas uma vez por sessão
- **Normal**: Deve aparecer apenas uma vez
- **Problema**: Aparece múltiplas vezes

## 🔍 Como Identificar Vazamentos

### 1. Efeitos que Disparam Muitas Vezes
```javascript
// ❌ PROBLEMA: Efeito disparando constantemente
[count] useSession/validation-interval: 15
[count] useSession/validation-interval: 16
[count] useSession/validation-interval: 17
```

**Solução**: Verificar dependências do `useEffect`

### 2. Intervals Não Limpos
```javascript
// ❌ PROBLEMA: Interval criado mas nunca limpo
[interval:start] useSession/validation id=123 ms=30000
[interval:start] useSession/validation id=124 ms=30000
[interval:start] useSession/validation id=125 ms=30000
// Sem interval:clear correspondente
```

**Solução**: Verificar se o `useEffect` retorna a função de limpeza

### 3. Múltiplos Intervals do Mesmo Tipo
```javascript
// ❌ PROBLEMA: Múltiplos intervals do mesmo tipo
[interval:start] useSession/validation id=123 ms=30000
[interval:start] useSession/validation id=124 ms=30000
[interval:start] useSession/validation id=125 ms=30000
```

**Solução**: Verificar se o componente está sendo montado múltiplas vezes

## 🛠️ Funções Disponíveis

### `count(label)` - Contar Execuções
```javascript
import { count } from '@/lib/net-debug';

useEffect(() => {
  count('MeuComponente/meu-efeito');
  // ... código do efeito
}, []);
```

### `logOnce(label)` - Log Único
```javascript
import { logOnce } from '@/lib/net-debug';

useEffect(() => {
  logOnce('MeuComponente/inicializacao');
  // ... código do efeito
}, []);
```

### `wrapInterval(fn, ms, label)` - Interval Instrumentado
```javascript
import { wrapInterval } from '@/lib/net-debug';

useEffect(() => {
  const clearInterval = wrapInterval(() => {
    // ... código do interval
  }, 5000, 'MeuComponente/polling');
  
  return () => clearInterval();
}, []);
```

### `wrapTimeout(fn, ms, label)` - Timeout Instrumentado
```javascript
import { wrapTimeout } from '@/lib/net-debug';

useEffect(() => {
  const clearTimeout = wrapTimeout(() => {
    // ... código do timeout
  }, 1000, 'MeuComponente/delay');
  
  return () => clearTimeout();
}, []);
```

## 🎯 Padrões de Uso

### 1. Instrumentar useEffect Críticos
```javascript
useEffect(() => {
  count('Componente/descricao');
  // ... código do efeito
}, [dependencias]);
```

### 2. Instrumentar setInterval
```javascript
useEffect(() => {
  const clearInterval = wrapInterval(() => {
    // ... código do interval
  }, 5000, 'Componente/polling');
  
  return () => clearInterval();
}, []);
```

### 3. Instrumentar setTimeout
```javascript
useEffect(() => {
  const clearTimeout = wrapTimeout(() => {
    // ... código do timeout
  }, 1000, 'Componente/delay');
  
  return () => clearTimeout();
}, []);
```

## 🚨 Sinais de Alerta

### Contadores Altos
- `[count]` > 5: Possível vazamento
- `[count]` > 10: Vazamento provável
- `[count]` > 50: Vazamento crítico

### Intervals Não Limpos
- `[interval:start]` sem `[interval:clear]` correspondente
- Múltiplos `[interval:start]` com mesmo label

### Logs Únicos Múltiplos
- `[once]` aparecendo múltiplas vezes
- Indica que o componente está sendo montado/desmontado repetidamente

## 🔧 Debugging Avançado

### Limpar Estado de Debug
```javascript
import { clearDebugState } from '@/lib/net-debug';

// Limpar todos os contadores e flags
clearDebugState();
```

### Desabilitar Debug
```javascript
import { setDebugEnabled } from '@/lib/net-debug';

// Desabilitar debug globalmente
setDebugEnabled(false);
```

### Verificar se Debug Está Habilitado
```javascript
import { isDebugEnabled } from '@/lib/net-debug';

if (isDebugEnabled()) {
  console.log('Debug está habilitado');
}
```

## 📝 Exemplo Prático

### Antes (Sem Instrumentação)
```javascript
useEffect(() => {
  const interval = setInterval(() => {
    // ... código
  }, 5000);
  
  return () => clearInterval(interval);
}, []);
```

### Depois (Com Instrumentação)
```javascript
import { wrapInterval, count } from '@/lib/net-debug';

useEffect(() => {
  count('MeuComponente/polling-setup');
  const clearInterval = wrapInterval(() => {
    // ... código
  }, 5000, 'MeuComponente/data-polling');
  
  return () => clearInterval();
}, []);
```

## 🎉 Benefícios

1. **Identificação Rápida**: Vazamentos são detectados imediatamente
2. **Debugging Visual**: Logs claros no console
3. **Sem Impacto**: Zero impacto na performance em produção
4. **Fácil Uso**: Funções simples e intuitivas
5. **Completo**: Cobre todos os tipos de vazamentos comuns

## 🚀 Próximos Passos

1. Abra o console do navegador
2. Navegue pelo site
3. Observe os logs
4. Identifique vazamentos
5. Corrija os problemas encontrados
6. Verifique se os vazamentos foram resolvidos

---

**Lembre-se**: A instrumentação é apenas para desenvolvimento. Em produção, o debug é automaticamente desabilitado para não impactar a performance.
