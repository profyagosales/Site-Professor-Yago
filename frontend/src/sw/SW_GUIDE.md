# Guia de Service Worker - Idempotente

Este guia explica como usar o sistema de Service Worker idempotente para evitar registros duplicados e loops de reload.

## 🚀 Como Funciona

O `register.ts` garante que o Service Worker seja registrado apenas uma vez, evitando loops de reload e registros duplicados.

### **Características:**
- ✅ **Registro Idempotente**: Previne registros múltiplos
- ✅ **Guard Interno**: Verifica se já foi registrado
- ✅ **Toast Manual**: Atualizações sem auto-reload
- ✅ **Error Handling**: Tratamento de erros robusto
- ✅ **Logging**: Debugging claro
- ✅ **TypeScript**: Tipagem completa

## 📋 Configuração

### **Variáveis de Ambiente (.env)**

```bash
# Habilitar Service Worker em desenvolvimento (opcional)
VITE_SW_ENABLED=false

# Em produção, Service Worker é carregado automaticamente
```

### **Configuração de Produção**

```bash
# Em produção, Service Worker é carregado automaticamente
# Para desenvolvimento, use:
VITE_SW_ENABLED=true
```

## 🛠️ Uso

### **Carregamento Automático (Recomendado)**

O Service Worker é carregado automaticamente no `main.tsx`:

```typescript
// main.tsx
import { registerServiceWorkerOnce, startUpdateChecker } from './sw/register';

function bootstrapServiceWorker() {
  const shouldRegisterSW = import.meta.env.PROD || import.meta.env.VITE_SW_ENABLED === 'true';
  
  if (shouldRegisterSW) {
    registerServiceWorkerOnce().then(registered => {
      if (registered) {
        console.info('[SW] Service Worker registrado com sucesso');
        startUpdateChecker();
      }
    });
  }
}

bootstrapServiceWorker();
```

### **Carregamento Manual**

```typescript
import { registerServiceWorkerOnce, serviceWorkerAPI } from '@/sw/register';

// Registrar Service Worker
const registered = await registerServiceWorkerOnce();
console.log('Service Worker registrado:', registered);

// Verificar informações
const info = serviceWorkerAPI.getInfo();
console.log('Informações do SW:', info);

// Verificar atualizações
const hasUpdates = await serviceWorkerAPI.checkForUpdates();
console.log('Há atualizações:', hasUpdates);
```

### **Controle de Atualizações**

```typescript
import { showUpdateToast, handleManualUpdate } from '@/sw/register';

// Mostrar toast de atualização
showUpdateToast();

// Atualizar manualmente
await handleManualUpdate();
```

## 🔧 API Reference

### **registerServiceWorkerOnce(): Promise<boolean>**

Registra o Service Worker apenas uma vez.

**Retorna:**
- `Promise<boolean>`: `true` se registrou, `false` se já estava registrado

**Exemplo:**
```typescript
const registered = await registerServiceWorkerOnce();
if (registered) {
  console.log('Service Worker registrado pela primeira vez');
} else {
  console.log('Service Worker já estava registrado');
}
```

### **checkForUpdates(): Promise<boolean>**

Verifica se há atualizações disponíveis.

**Retorna:**
- `Promise<boolean>`: `true` se há atualizações

**Exemplo:**
```typescript
const hasUpdates = await checkForUpdates();
if (hasUpdates) {
  console.log('Atualizações disponíveis');
}
```

### **forceUpdate(): Promise<boolean>**

Força atualização do Service Worker.

**Retorna:**
- `Promise<boolean>`: `true` se atualizou

**Exemplo:**
```typescript
const updated = await forceUpdate();
if (updated) {
  console.log('Service Worker atualizado');
}
```

### **getServiceWorkerInfo(): object**

Obtém informações do Service Worker.

**Retorna:**
- `object`: Informações do estado do SW

**Exemplo:**
```typescript
const info = getServiceWorkerInfo();
console.log('SW Info:', info);
```

### **showUpdateToast(): void**

Mostra toast de atualização disponível.

**Exemplo:**
```typescript
showUpdateToast(); // Mostra toast com botão "Atualizar"
```

### **handleManualUpdate(): Promise<void>**

Atualiza o aplicativo manualmente.

**Exemplo:**
```typescript
await handleManualUpdate(); // Atualiza e recarrega
```

## 🎯 Funcionalidades do Service Worker

### **Cache de Recursos**

- **Recursos Estáticos**: CSS, JS, imagens
- **Estratégia**: Cache First
- **Fallback**: Network em caso de erro

### **Cache de API**

- **Requisições de API**: Endpoints do backend
- **Estratégia**: Network First
- **Fallback**: Cache em caso de erro de rede

### **Atualizações Controladas**

- **Detecção**: Automática de novas versões
- **Notificação**: Toast manual para atualizar
- **Controle**: Usuário decide quando atualizar

### **Notificações Push**

- **Suporte**: Preparado para notificações
- **Ações**: Botões de ação personalizados
- **Navegação**: Abertura de páginas específicas

## 🚨 Solução de Problemas

### **Service Worker não registra**

1. **Verificar suporte:**
   ```javascript
   if ('serviceWorker' in navigator) {
     console.log('Service Worker suportado');
   } else {
     console.log('Service Worker não suportado');
   }
   ```

2. **Verificar console:**
   ```javascript
   // Deve aparecer:
   [SW] Iniciando registro idempotente do Service Worker...
   [SW] Service Worker registrado com sucesso
   ```

3. **Verificar Network:**
   - Arquivo `sw.js` deve ser carregado
   - Sem requisições duplicadas

### **Loops de reload**

1. **Verificar se não há `location.reload()` automático**
2. **Usar apenas toast manual para atualizações**
3. **Verificar se não há registros duplicados**

### **Service Worker não atualiza**

1. **Verificar se há controlador ativo:**
   ```javascript
   if (navigator.serviceWorker.controller) {
     console.log('Há controlador ativo');
   }
   ```

2. **Forçar atualização:**
   ```javascript
   await forceUpdate();
   ```

3. **Verificar cache:**
   - Limpar cache do navegador
   - Verificar se arquivo `sw.js` foi atualizado

## 📊 Monitoramento

### **Console Logs**

```javascript
// Registro bem-sucedido
[SW] Iniciando registro idempotente do Service Worker...
[SW] Service Worker registrado com sucesso
[SW] Service Worker instalado
[SW] Service Worker ativado

// Tentativa de registro duplicado
[SW] Service Worker já foi registrado anteriormente

// Atualização disponível
[SW] Nova versão do Service Worker encontrada
[SW] Nova versão instalada, mostrando toast de atualização

// Erro de registro
[SW] Erro ao registrar Service Worker: Error: Failed to register
```

### **Network Tab**

- **sw.js**: Deve aparecer apenas uma vez
- **Requisições**: Sem duplicação
- **Cache**: Recursos servidos do cache

## 🎉 Benefícios

1. **Zero Duplicação**: Service Worker registrado apenas uma vez
2. **Sem Loops**: Atualizações controladas pelo usuário
3. **Performance**: Cache de recursos estáticos
4. **Confiabilidade**: Guard interno previne erros
5. **Flexibilidade**: Configuração via variáveis de ambiente
6. **Manutenibilidade**: Código centralizado e organizado

## 🔄 Migração

### **Antes (Problemático)**

```typescript
// ❌ Em cada componente
useEffect(() => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js');
  }
}, []);

// ❌ Auto-reload em atualizações
navigator.serviceWorker.addEventListener('updatefound', () => {
  window.location.reload(); // Loop!
});
```

### **Depois (Correto)**

```typescript
// ✅ Apenas no main.tsx
import { registerServiceWorkerOnce } from './sw/register';

bootstrapServiceWorker(); // Registra uma vez

// ✅ Toast manual para atualizações
showUpdateToast(); // Usuário decide quando atualizar
```

## 📝 Exemplos Práticos

### **Verificação de Status**

```typescript
function ServiceWorkerStatus() {
  const [info, setInfo] = useState(null);

  useEffect(() => {
    const swInfo = getServiceWorkerInfo();
    setInfo(swInfo);
  }, []);

  return (
    <div>
      <p>Suportado: {info?.isSupported ? '✅' : '❌'}</p>
      <p>Registrado: {info?.isRegistered ? '✅' : '❌'}</p>
      <p>Controlador: {info?.hasController ? '✅' : '❌'}</p>
    </div>
  );
}
```

### **Controle Manual de Atualizações**

```typescript
function UpdateButton() {
  const [hasUpdates, setHasUpdates] = useState(false);

  const checkUpdates = async () => {
    const updates = await checkForUpdates();
    setHasUpdates(updates);
  };

  const handleUpdate = async () => {
    await handleManualUpdate();
  };

  return (
    <div>
      <button onClick={checkUpdates}>
        Verificar Atualizações
      </button>
      {hasUpdates && (
        <button onClick={handleUpdate}>
          Atualizar Agora
        </button>
      )}
    </div>
  );
}
```

### **Debug de Service Worker**

```typescript
function ServiceWorkerDebug() {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    const originalLog = console.log;
    console.log = (...args) => {
      if (args[0]?.includes('[SW]')) {
        setLogs(prev => [...prev, args.join(' ')]);
      }
      originalLog(...args);
    };

    return () => {
      console.log = originalLog;
    };
  }, []);

  return (
    <div>
      <h3>Service Worker Logs</h3>
      {logs.map((log, index) => (
        <div key={index}>{log}</div>
      ))}
    </div>
  );
}
```

## 🔧 Configuração Avançada

### **Personalizar Cache**

```typescript
// Em sw.js
const CACHE_NAME = 'site-professor-yago-v2'; // Atualizar versão
const STATIC_CACHE_URLS = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json',
  // Adicionar mais recursos
];
```

### **Personalizar Estratégias**

```typescript
// Em sw.js
function isStaticResource(url) {
  return url.includes('/static/') || 
         url.includes('.js') || 
         url.includes('.css') || 
         url.includes('.png') || 
         url.includes('.jpg') || 
         url.includes('.jpeg') || 
         url.includes('.gif') || 
         url.includes('.svg') || 
         url.includes('.ico');
}

function isAPIRequest(url) {
  return url.includes('/api/') || 
         url.includes('localhost:3000') || 
         url.includes('vercel.app');
}
```

### **Personalizar Toast**

```typescript
// Em register.ts
function showUpdateToast() {
  toast({
    title: 'Nova versão disponível',
    description: 'Uma nova versão do aplicativo está disponível. Deseja atualizar?',
    type: 'info',
    duration: 0,
    action: {
      label: 'Atualizar',
      onClick: handleManualUpdate,
    },
    dismissible: true,
  });
}
```

---

**Lembre-se**: O Service Worker singleton é projetado para ser usado apenas uma vez no ciclo de vida da aplicação. Use-o no `main.tsx` para garantir que não haja registros duplicados ou loops de reload.
