# Guia de Revalidações de Dados - Anti-Pico de Rede

Este guia explica como usar o sistema de revalidações controladas para evitar picos de rede ao abrir DevTools ou alternar abas.

## 🚀 Como Funciona

O `DataProvider` controla as revalidações de dados globalmente, desabilitando `refetchOnWindowFocus` por padrão e permitindo ativação local onde necessário.

### **Características:**
- ✅ **Revalidação Global**: Desabilitada no foco por padrão
- ✅ **Revalidação Local**: Ativada onde necessário
- ✅ **Reconexão**: Habilitada para sincronizar dados
- ✅ **Debugging**: Monitoramento em tempo real
- ✅ **Performance**: Evita picos de rede
- ✅ **Flexibilidade**: Configuração por hook

## 📋 Configuração Global

### **DataProvider**

```typescript
// main.tsx
import { DataProvider } from './providers/DataProvider';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <DataProvider>
      <UIProvider>
        <AuthProvider>
          {/* ... resto da app */}
        </AuthProvider>
      </UIProvider>
    </DataProvider>
  </React.StrictMode>
);
```

### **Configuração Padrão**

```typescript
const DEFAULT_CONFIG = {
  refetchOnWindowFocus: false, // Desabilitado para evitar picos
  refetchOnReconnect: true,    // Habilitado para sincronizar
  refetchOnMount: true,        // Habilitado para dados frescos
  defaultTtlMs: 30000,         // 30 segundos
  enableDebugLogging: true,    // Apenas em desenvolvimento
};
```

## 🛠️ Uso

### **Hook Padrão (Sem Revalidação no Foco)**

```typescript
import { useCachedQuery } from '@/hooks/useCachedQuery';

function MyComponent() {
  const { data, isLoading, error } = useCachedQuery(
    'my-data',
    fetchMyData,
    {
      ttlMs: 30000,
      // refetchOnWindowFocus: false (padrão global)
      // refetchOnReconnect: true (padrão global)
    }
  );

  return <div>{data}</div>;
}
```

### **Hook com Revalidação no Foco**

```typescript
import { useCachedQuery } from '@/hooks/useCachedQuery';

function MyComponent() {
  const { data, isLoading, error } = useCachedQuery(
    'my-data',
    fetchMyData,
    {
      ttlMs: 30000,
      refetchOnWindowFocus: true, // Ativar localmente
      refetchOnReconnect: true,
    }
  );

  return <div>{data}</div>;
}
```

### **Hook Especializado (OMR Processing)**

```typescript
import { useOMRProcessing } from '@/hooks/useOMRProcessing';

function OMRComponent() {
  const {
    processamentos,
    aplicacoes,
    isLoading,
    refresh,
  } = useOMRProcessing({
    ttlMs: 10000,
    refetchOnWindowFocus: true, // Sempre ativo para fila OMR
  });

  return <div>{/* ... */}</div>;
}
```

### **Hook Especializado (Dashboard)**

```typescript
import { useDashboardWithFocus } from '@/hooks/useDashboardWithFocus';

function DashboardComponent() {
  const {
    summary,
    stats,
    isLoading,
    refresh,
  } = useDashboardWithFocus({
    ttlMs: 30000,
    refetchOnWindowFocus: true, // Sempre ativo para dashboard
  });

  return <div>{/* ... */}</div>;
}
```

## 🔧 API Reference

### **useCachedQuery**

Hook principal para consultas com cache.

```typescript
function useCachedQuery<T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: UseCachedQueryOptions
): UseCachedQueryReturn<T>
```

**Parâmetros:**
- `key`: Chave única para o cache
- `fetcher`: Função que retorna os dados
- `options`: Configurações opcionais

**Opções:**
- `ttlMs`: Tempo de vida do cache (padrão: 30000ms)
- `enabled`: Se a consulta está habilitada (padrão: true)
- `refetchOnMount`: Revalidar no mount (padrão: global)
- `refetchOnWindowFocus`: Revalidar no foco (padrão: false)
- `refetchOnReconnect`: Revalidar na reconexão (padrão: true)
- `staleTime`: Tempo para considerar stale (padrão: 15000ms)

### **useRevalidationConfig**

Hook para acessar configurações globais.

```typescript
function useRevalidationConfig(): DataProviderConfig
```

**Retorna:**
- `refetchOnWindowFocus`: Configuração global
- `refetchOnReconnect`: Configuração global
- `refetchOnMount`: Configuração global

### **useLocalRevalidation**

Hook para configuração local de revalidação.

```typescript
function useLocalRevalidation(
  key: string,
  localConfig?: Partial<DataProviderConfig>
): { config: DataProviderConfig; logRevalidation: (reason: string) => void }
```

**Parâmetros:**
- `key`: Chave para logging
- `localConfig`: Configurações locais

**Retorna:**
- `config`: Configuração final (local + global)
- `logRevalidation`: Função para logging

### **useRevalidationMonitor**

Hook para monitorar revalidações.

```typescript
function useRevalidationMonitor(): {
  revalidationCount: number;
  lastRevalidation: Date | null;
  logRevalidation: (source: string, key: string, reason: string) => void;
  resetCount: () => void;
}
```

**Retorna:**
- `revalidationCount`: Contador de revalidações
- `lastRevalidation`: Data da última revalidação
- `logRevalidation`: Função para logging
- `resetCount`: Função para resetar contador

## 🎯 Casos de Uso

### **Dashboard (Revalidação no Foco)**

```typescript
function Dashboard() {
  const { data, isLoading } = useCachedQuery(
    'dashboard-data',
    fetchDashboardData,
    {
      refetchOnWindowFocus: true, // Manter dados atualizados
      ttlMs: 30000,
    }
  );

  return <div>{/* Dashboard content */}</div>;
}
```

### **Fila OMR (Revalidação no Foco)**

```typescript
function OMRQueue() {
  const { processamentos, refresh } = useOMRProcessing({
    refetchOnWindowFocus: true, // Manter fila atualizada
    ttlMs: 10000,
  });

  return <div>{/* OMR queue content */}</div>;
}
```

### **Lista de Dados (Sem Revalidação no Foco)**

```typescript
function DataList() {
  const { data, isLoading } = useCachedQuery(
    'data-list',
    fetchDataList,
    {
      // refetchOnWindowFocus: false (padrão)
      ttlMs: 60000,
    }
  );

  return <div>{/* List content */}</div>;
}
```

### **Dados Estáticos (Sem Revalidação)**

```typescript
function StaticData() {
  const { data, isLoading } = useCachedQuery(
    'static-data',
    fetchStaticData,
    {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      ttlMs: 300000, // 5 minutos
    }
  );

  return <div>{/* Static content */}</div>;
}
```

## 🚨 Solução de Problemas

### **Picos de Rede ao Abrir DevTools**

1. **Verificar configuração global:**
   ```typescript
   const config = useRevalidationConfig();
   console.log('Config global:', config);
   ```

2. **Verificar logs de revalidação:**
   ```javascript
   [DataRevalidation] Local: my-key - Window focus
   [DataRevalidation] Local: my-key - Network reconnection
   ```

3. **Verificar se há hooks com revalidação ativa:**
   ```typescript
   // ❌ Problemático
   useCachedQuery('key', fetcher, { refetchOnWindowFocus: true });
   
   // ✅ Correto (para dados que não precisam)
   useCachedQuery('key', fetcher); // Usa padrão global
   ```

### **Dados Não Atualizam**

1. **Verificar se revalidação está ativa:**
   ```typescript
   const { config } = useLocalRevalidation('my-key');
   console.log('Config local:', config);
   ```

2. **Ativar revalidação localmente:**
   ```typescript
   useCachedQuery('key', fetcher, {
     refetchOnWindowFocus: true, // Ativar localmente
   });
   ```

3. **Verificar TTL do cache:**
   ```typescript
   useCachedQuery('key', fetcher, {
     ttlMs: 10000, // 10 segundos
   });
   ```

### **Performance Ruim**

1. **Desabilitar revalidação desnecessária:**
   ```typescript
   useCachedQuery('key', fetcher, {
     refetchOnWindowFocus: false, // Desabilitar
     refetchOnReconnect: false,   // Desabilitar
   });
   ```

2. **Aumentar TTL para dados estáticos:**
   ```typescript
   useCachedQuery('key', fetcher, {
     ttlMs: 300000, // 5 minutos
   });
   ```

3. **Usar cache mais agressivo:**
   ```typescript
   useCachedQuery('key', fetcher, {
     staleTime: 60000, // 1 minuto para considerar stale
   });
   ```

## 📊 Monitoramento

### **Console Logs**

```javascript
// Configuração carregada
[DataProvider] Configuração carregada: {
  refetchOnWindowFocus: false,
  refetchOnReconnect: true,
  refetchOnMount: true,
  defaultTtlMs: 30000
}

// Revalidação local
[DataRevalidation] Local: omr-processamentos - Window focus
[DataRevalidation] Local: dashboard-summary - Network reconnection

// Configuração local sobrescrevendo global
[DataRevalidation] Configuração local para omr-processamentos: [
  ["refetchOnWindowFocus", true]
]
```

### **Debugger Visual**

O `RevalidationDebugger` mostra:
- **Count**: Número de revalidações
- **Last**: Data da última revalidação
- **Status**: Active/Idle
- **Reset**: Botão para resetar contador

### **Network Tab**

- **Requisições**: Devem aparecer apenas quando necessário
- **Foco**: Sem picos ao abrir DevTools
- **Reconexão**: Apenas quando necessário

## 🎉 Benefícios

1. **Zero Picos**: Revalidação no foco desabilitada por padrão
2. **Performance**: Menos requisições desnecessárias
3. **Flexibilidade**: Ativação local onde necessário
4. **Debugging**: Monitoramento em tempo real
5. **Configuração**: Centralizada e consistente
6. **Manutenibilidade**: Hooks especializados

## 🔄 Migração

### **Antes (Problemático)**

```typescript
// ❌ Revalidação no foco ativa por padrão
useCachedQuery('key', fetcher, {
  refetchOnWindowFocus: true, // Causa picos de rede
});

// ❌ Sem controle global
// Cada hook configura individualmente
```

### **Depois (Correto)**

```typescript
// ✅ Revalidação no foco desabilitada globalmente
useCachedQuery('key', fetcher); // Usa padrão global

// ✅ Ativação local onde necessário
useCachedQuery('key', fetcher, {
  refetchOnWindowFocus: true, // Apenas onde necessário
});

// ✅ Hooks especializados
useOMRProcessing(); // Já configurado corretamente
```

## 📝 Exemplos Práticos

### **Componente com Revalidação Inteligente**

```typescript
function SmartComponent() {
  const { data, isLoading } = useCachedQuery(
    'smart-data',
    fetchSmartData,
    {
      ttlMs: 30000,
      // Usa configuração global (refetchOnWindowFocus: false)
    }
  );

  return <div>{data}</div>;
}
```

### **Componente com Revalidação no Foco**

```typescript
function FocusComponent() {
  const { data, isLoading } = useCachedQuery(
    'focus-data',
    fetchFocusData,
    {
      ttlMs: 10000,
      refetchOnWindowFocus: true, // Ativar localmente
    }
  );

  return <div>{data}</div>;
}
```

### **Hook Personalizado**

```typescript
function useMyData() {
  return useCachedQuery(
    'my-data',
    fetchMyData,
    {
      ttlMs: 60000,
      refetchOnWindowFocus: true, // Configuração específica
      refetchOnReconnect: true,
    }
  );
}
```

### **Monitoramento de Revalidações**

```typescript
function RevalidationMonitor() {
  const { revalidationCount, lastRevalidation } = useRevalidationMonitor();

  return (
    <div>
      <p>Revalidações: {revalidationCount}</p>
      <p>Última: {lastRevalidation?.toLocaleTimeString()}</p>
    </div>
  );
}
```

---

**Lembre-se**: O sistema de revalidações é projetado para evitar picos de rede. Use revalidação no foco apenas onde realmente necessário, como filas de processamento ou dashboards que precisam estar sempre atualizados.
