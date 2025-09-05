# Guia de Analytics Singleton

Este guia explica como usar o sistema de analytics singleton para evitar injeção múltipla de scripts e pings duplicados.

## 🚀 Como Funciona

O `analytics-singleton.ts` garante que scripts de analytics sejam injetados apenas uma vez, mesmo com múltiplos renders ou navegação.

### **Características:**
- ✅ **Singleton Pattern**: Previne injeção múltipla
- ✅ **Guard Interno**: Verifica se já foi carregado
- ✅ **Múltiplos Providers**: Suporte a GA4, Plausible, Vercel, Zoho
- ✅ **Configuração via ENV**: Controle via variáveis de ambiente
- ✅ **Error Handling**: Tratamento de erros robusto
- ✅ **TypeScript**: Tipagem completa

## 📋 Configuração

### **Variáveis de Ambiente (.env)**

```bash
# Habilitar analytics em desenvolvimento (opcional)
VITE_ANALYTICS_ENABLED=false

# Google Analytics 4
VITE_GA4_ENABLED=false
VITE_GA4_MEASUREMENT_ID=G-XXXXXXXXXX

# Plausible Analytics
VITE_PLAUSIBLE_ENABLED=false
VITE_PLAUSIBLE_DOMAIN=site-professor-yago.vercel.app

# Vercel Analytics
VITE_VERCEL_ANALYTICS_ENABLED=false

# Zoho Analytics
VITE_ZOHO_ANALYTICS_ENABLED=false
```

### **Configuração de Produção**

```bash
# Em produção, analytics é carregado automaticamente
# Para desenvolvimento, use:
VITE_ANALYTICS_ENABLED=true
VITE_GA4_ENABLED=true
VITE_GA4_MEASUREMENT_ID=G-XXXXXXXXXX
```

## 🛠️ Uso

### **Carregamento Automático (Recomendado)**

O analytics é carregado automaticamente no `main.tsx`:

```typescript
// main.tsx
import { loadAnalyticsOnce } from './lib/analytics-singleton';

function bootstrapAnalytics() {
  const shouldLoadAnalytics = import.meta.env.PROD || import.meta.env.VITE_ANALYTICS_ENABLED === 'true';
  
  if (shouldLoadAnalytics) {
    loadAnalyticsOnce().catch(error => {
      console.warn('[analytics] Falha ao carregar analytics:', error);
    });
  }
}

bootstrapAnalytics();
```

### **Carregamento Manual**

```typescript
import { loadAnalyticsOnce, isAnalyticsLoaded, reloadAnalytics } from '@/lib/analytics-singleton';

// Carregar analytics
const loaded = await loadAnalyticsOnce();
console.log('Analytics carregado:', loaded);

// Verificar se já foi carregado
if (isAnalyticsLoaded()) {
  console.log('Analytics já está carregado');
}

// Forçar recarregamento (apenas para testes)
await reloadAnalytics();
```

### **Banner de Consentimento**

```typescript
import { loadAnalyticsOnce } from '@/lib/analytics-singleton';

function ConsentBanner() {
  const handleAccept = async () => {
    // Carregar analytics após aceite
    await loadAnalyticsOnce();
    // O guard interno previne carregamento duplicado
  };

  return (
    <div>
      <button onClick={handleAccept}>
        Aceitar Cookies
      </button>
    </div>
  );
}
```

## 🔧 API Reference

### **loadAnalyticsOnce(force?: boolean): Promise<boolean>**

Carrega analytics apenas uma vez.

**Parâmetros:**
- `force` (opcional): Força recarregamento mesmo se já carregado

**Retorna:**
- `Promise<boolean>`: `true` se carregou, `false` se já estava carregado

**Exemplo:**
```typescript
const loaded = await loadAnalyticsOnce();
if (loaded) {
  console.log('Analytics carregado pela primeira vez');
} else {
  console.log('Analytics já estava carregado');
}
```

### **isAnalyticsLoaded(): boolean**

Verifica se analytics já foi carregado.

**Retorna:**
- `boolean`: `true` se carregado, `false` caso contrário

**Exemplo:**
```typescript
if (isAnalyticsLoaded()) {
  console.log('Analytics está ativo');
}
```

### **reloadAnalytics(): Promise<boolean>**

Força recarregamento de analytics.

**Retorna:**
- `Promise<boolean>`: `true` se recarregou

**Exemplo:**
```typescript
await reloadAnalytics();
console.log('Analytics recarregado');
```

### **resetAnalyticsState(): void**

Reseta o estado interno (apenas para testes).

**Exemplo:**
```typescript
resetAnalyticsState();
console.log('Estado resetado');
```

## 🎯 Providers Suportados

### **Google Analytics 4**

```bash
VITE_GA4_ENABLED=true
VITE_GA4_MEASUREMENT_ID=G-XXXXXXXXXX
```

**Funcionalidades:**
- Carregamento automático do script
- Configuração automática do gtag
- Tracking de page views
- Eventos customizados

### **Plausible Analytics**

```bash
VITE_PLAUSIBLE_ENABLED=true
VITE_PLAUSIBLE_DOMAIN=seu-dominio.com
```

**Funcionalidades:**
- Script assíncrono
- Configuração automática
- Tracking de page views
- Eventos customizados

### **Vercel Analytics**

```bash
VITE_VERCEL_ANALYTICS_ENABLED=true
```

**Funcionalidades:**
- Script do Vercel
- Tracking automático
- Métricas de performance

### **Zoho Analytics**

```bash
VITE_ZOHO_ANALYTICS_ENABLED=true
```

**Funcionalidades:**
- Script do Zoho
- Configuração automática
- Tracking de eventos

## 🚨 Solução de Problemas

### **Analytics não carrega**

1. **Verificar variáveis de ambiente:**
   ```bash
   echo $VITE_ANALYTICS_ENABLED
   echo $VITE_GA4_ENABLED
   ```

2. **Verificar console:**
   ```javascript
   // Deve aparecer:
   [analytics] Iniciando carregamento de analytics...
   [once] analytics loaded
   ```

3. **Verificar Network:**
   - Scripts devem aparecer apenas uma vez
   - Sem requisições duplicadas

### **Scripts duplicados**

1. **Verificar se está chamando `loadAnalyticsOnce()` em múltiplos lugares**
2. **Usar apenas no `main.tsx` ou layout raiz**
3. **Verificar se não há injeções manuais de scripts**

### **Analytics não funciona em desenvolvimento**

```bash
# Habilitar em desenvolvimento
VITE_ANALYTICS_ENABLED=true
VITE_GA4_ENABLED=true
VITE_GA4_MEASUREMENT_ID=G-XXXXXXXXXX
```

## 📊 Monitoramento

### **Console Logs**

```javascript
// Carregamento bem-sucedido
[analytics] Iniciando carregamento de analytics...
[analytics] Script carregado: https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX
[analytics] Google Analytics configurado: G-XXXXXXXXXX
[once] analytics loaded

// Tentativa de carregamento duplicado
[analytics] Analytics já carregado, ignorando

// Erro de carregamento
[analytics] Erro ao carregar Google Analytics: Error: Failed to load
```

### **Network Tab**

- **Scripts**: Devem aparecer apenas uma vez
- **Requisições**: Sem duplicação
- **Timing**: Carregamento assíncrono

## 🎉 Benefícios

1. **Zero Duplicação**: Scripts injetados apenas uma vez
2. **Performance**: Sem acúmulo de scripts
3. **Confiabilidade**: Guard interno previne erros
4. **Flexibilidade**: Múltiplos providers suportados
5. **Manutenibilidade**: Configuração centralizada
6. **Debugging**: Logs claros para troubleshooting

## 🔄 Migração

### **Antes (Problemático)**

```typescript
// ❌ Em cada componente
useEffect(() => {
  const script = document.createElement('script');
  script.src = 'https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX';
  document.head.appendChild(script);
}, []);
```

### **Depois (Correto)**

```typescript
// ✅ Apenas no main.tsx
import { loadAnalyticsOnce } from './lib/analytics-singleton';

bootstrapAnalytics(); // Carrega uma vez
```

## 📝 Exemplos Práticos

### **Carregamento Condicional**

```typescript
// Carregar apenas se usuário aceitou cookies
const [consentGiven, setConsentGiven] = useState(false);

useEffect(() => {
  if (consentGiven) {
    loadAnalyticsOnce();
  }
}, [consentGiven]);
```

### **Carregamento com Retry**

```typescript
async function loadAnalyticsWithRetry(maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await loadAnalyticsOnce();
      break;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}
```

### **Verificação de Status**

```typescript
function AnalyticsStatus() {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(isAnalyticsLoaded());
  }, []);

  return (
    <div>
      Analytics: {loaded ? '✅ Ativo' : '❌ Inativo'}
    </div>
  );
}
```

---

**Lembre-se**: O analytics singleton é projetado para ser usado apenas uma vez no ciclo de vida da aplicação. Use-o no `main.tsx` ou layout raiz para garantir que não haja duplicação de scripts.
