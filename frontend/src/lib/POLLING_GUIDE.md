# Guia de Polling e Timers - Cleanup Garantido

Este guia explica como usar o sistema de polling e timers com cleanup garantido para evitar vazamentos de memória e tempestades de requisições.

## 🚀 Como Funciona

O `wrapInterval` fornece cleanup automático e tracking global de intervals, evitando vazamentos de memória e facilitando o debugging.

### **Características:**
- ✅ **Cleanup automático**: Função de limpeza retornada
- ✅ **Tracking global**: Monitora todos os intervals ativos
- ✅ **Logging detalhado**: Para debugging e monitoramento
- ✅ **Prevenção de vazamentos**: Evita intervals órfãos

## 📋 Uso Básico

### **Padrão Correto com useEffect:**

```typescript
import { wrapInterval } from '@/lib/net-debug';

function MyComponent() {
  useEffect(() => {
    const stop = wrapInterval(fetchData, 30000, 'dashboard-poll');
    return () => stop(); // cleanup OBRIGATÓRIO
  }, []); // dependências corretas
}
```

### **Com Dependências:**

```typescript
function MyComponent({ userId }: { userId: string }) {
  useEffect(() => {
    const stop = wrapInterval(() => {
      fetchUserData(userId);
    }, 10000, 'user-data-poll');
    
    return () => stop(); // cleanup OBRIGATÓRIO
  }, [userId]); // dependências corretas
}
```

## 🔧 API Reference

### **wrapInterval(fn, ms, label)**

Envolve `setInterval` com logging e tracking global.

**Parâmetros:**
- `fn`: Função a ser executada
- `ms`: Intervalo em milissegundos
- `label`: Label para logging e debugging

**Retorna:**
- Função de limpeza que deve ser chamada no cleanup do `useEffect`

**Exemplo:**
```typescript
const stop = wrapInterval(() => {
  console.log('Polling data...');
  fetchData();
}, 5000, 'data-poll');

// No cleanup do useEffect
return () => stop();
```

## 🎯 Padrões de Uso

### **1. Polling de Dados (Dashboard)**

```typescript
function Dashboard() {
  const [data, setData] = useState(null);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await api.get('/dashboard');
        setData(response.data);
      } catch (error) {
        console.error('Erro ao buscar dados:', error);
      }
    };
    
    // Buscar dados imediatamente
    fetchData();
    
    // Polling a cada 30 segundos
    const stop = wrapInterval(fetchData, 30000, 'dashboard-poll');
    
    return () => stop();
  }, []);
  
  return <div>{/* Dashboard content */}</div>;
}
```

### **2. Polling com Dependências**

```typescript
function UserProfile({ userId }: { userId: string }) {
  const [user, setUser] = useState(null);
  
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await api.get(`/users/${userId}`);
        setUser(response.data);
      } catch (error) {
        console.error('Erro ao buscar usuário:', error);
      }
    };
    
    fetchUser();
    
    const stop = wrapInterval(fetchUser, 15000, 'user-profile-poll');
    
    return () => stop();
  }, [userId]); // Re-executa quando userId muda
  
  return <div>{/* User profile content */}</div>;
}
```

### **3. Polling Condicional**

```typescript
function DataTable({ autoRefresh = false }: { autoRefresh?: boolean }) {
  const [data, setData] = useState([]);
  
  useEffect(() => {
    const fetchData = async () => {
      const response = await api.get('/data');
      setData(response.data);
    };
    
    fetchData();
    
    if (autoRefresh) {
      const stop = wrapInterval(fetchData, 10000, 'table-auto-refresh');
      return () => stop();
    }
  }, [autoRefresh]);
  
  return <div>{/* Table content */}</div>;
}
```

### **4. Polling com Cleanup Manual**

```typescript
function PollingComponent() {
  const [isPolling, setIsPolling] = useState(false);
  const [stopPolling, setStopPolling] = useState<(() => void) | null>(null);
  
  const startPolling = () => {
    if (isPolling) return;
    
    const stop = wrapInterval(() => {
      console.log('Polling...');
      // Lógica de polling
    }, 5000, 'manual-poll');
    
    setStopPolling(() => stop);
    setIsPolling(true);
  };
  
  const stopPolling = () => {
    if (stopPolling) {
      stopPolling();
      setStopPolling(null);
      setIsPolling(false);
    }
  };
  
  useEffect(() => {
    return () => {
      // Cleanup ao desmontar
      if (stopPolling) {
        stopPolling();
      }
    };
  }, [stopPolling]);
  
  return (
    <div>
      <button onClick={startPolling} disabled={isPolling}>
        Iniciar Polling
      </button>
      <button onClick={stopPolling} disabled={!isPolling}>
        Parar Polling
      </button>
    </div>
  );
}
```

## 🚨 Padrões Incorretos (Evitar)

### **❌ Sem Cleanup:**

```typescript
// ERRADO - causa vazamento de memória
useEffect(() => {
  setInterval(() => {
    fetchData();
  }, 5000);
}, []);
```

### **❌ Cleanup Incorreto:**

```typescript
// ERRADO - não limpa o interval
useEffect(() => {
  const interval = setInterval(() => {
    fetchData();
  }, 5000);
  
  // Não retorna função de limpeza
}, []);
```

### **❌ Dependências Incorretas:**

```typescript
// ERRADO - recria interval desnecessariamente
useEffect(() => {
  const stop = wrapInterval(fetchData, 5000, 'poll');
  return () => stop();
}, [fetchData]); // fetchData muda a cada render
```

## 🔍 Debugging

### **Console Logs:**

```javascript
// Início do interval
[interval:start] dashboard-poll id=123 ms=30000

// Fim do interval
[interval:clear] dashboard-poll id=123
```

### **Tracking Global:**

```javascript
// Verificar intervals ativos
console.log(window.__intervals__);
// Set(3) { 123, 124, 125 }
```

### **Debug de Vazamentos:**

```javascript
// Verificar se há intervals órfãos
setInterval(() => {
  console.log('Intervals ativos:', window.__intervals__?.size || 0);
}, 10000);
```

## 🎯 Configuração de Revalidações

### **DataProvider (Global):**

```typescript
// frontend/src/providers/DataProvider.tsx
const DEFAULT_CONFIG = {
  refetchOnWindowFocus: false, // Desabilitado para evitar picos
  refetchOnReconnect: true,    // Habilitado para sincronizar
  refetchOnMount: true,        // Habilitado para dados frescos
};
```

### **Hooks Especializados:**

```typescript
// Para casos que precisam de revalidação no foco
const { data } = useCachedQuery('key', fetcher, {
  refetchOnWindowFocus: true, // Ativar localmente
});
```

## 📊 Monitoramento

### **Contador de Intervals:**

```typescript
function IntervalMonitor() {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    const stop = wrapInterval(() => {
      setCount(window.__intervals__?.size || 0);
    }, 1000, 'interval-monitor');
    
    return () => stop();
  }, []);
  
  return <div>Intervals ativos: {count}</div>;
}
```

### **Debug de Performance:**

```typescript
function PerformanceMonitor() {
  useEffect(() => {
    const stop = wrapInterval(() => {
      const intervals = window.__intervals__?.size || 0;
      if (intervals > 10) {
        console.warn(`Muitos intervals ativos: ${intervals}`);
      }
    }, 5000, 'performance-monitor');
    
    return () => stop();
  }, []);
  
  return null;
}
```

## 🎉 Benefícios

### **1. Prevenção de Vazamentos:**
- **Cleanup automático**: Intervals são limpos adequadamente
- **Tracking global**: Monitora todos os intervals ativos
- **Debugging fácil**: Identifica intervals órfãos

### **2. Performance:**
- **Sem acúmulo**: Intervals não se acumulam com navegação
- **Controle fino**: Gerenciamento preciso de polling
- **Otimização**: Evita requisições desnecessárias

### **3. Manutenibilidade:**
- **Padrão consistente**: Uso padronizado em todo o projeto
- **Logging detalhado**: Fácil debugging e monitoramento
- **Código limpo**: Implementação clara e legível

## 🔄 Migração

### **Antes (Problemático):**

```typescript
useEffect(() => {
  const interval = setInterval(() => {
    fetchData();
  }, 5000);
  
  return () => clearInterval(interval);
}, []);
```

### **Depois (Correto):**

```typescript
useEffect(() => {
  const stop = wrapInterval(fetchData, 5000, 'data-poll');
  return () => stop();
}, []);
```

---

**Lembre-se**: Sempre use `wrapInterval` para polling e garanta que a função de cleanup seja chamada no `useEffect`!
