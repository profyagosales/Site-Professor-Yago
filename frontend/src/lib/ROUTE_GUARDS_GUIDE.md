# Guia de Guardas de Rota - Anti-Loop

Este guia explica como usar o sistema de guardas de rota para evitar loops de navegação e redirecionamentos desnecessários.

## 🚀 Como Funciona

O `route-guards.ts` implementa guardas inteligentes que previnem loops de navegação e redirecionamentos desnecessários em rotas públicas.

### **Características:**
- ✅ **Lista Explícita**: Rotas públicas definidas explicitamente
- ✅ **Prevenção de Loops**: Evita navigate em rotas públicas
- ✅ **Validação de Token**: Só chama /auth/me com token
- ✅ **Guardas Inteligentes**: Diferentes tipos de usuário
- ✅ **Logging**: Debugging claro
- ✅ **TypeScript**: Tipagem completa

## 📋 Rotas Públicas

### **Lista Explícita de Rotas Públicas:**

```typescript
export const PUBLIC_ROUTES = [
  ROUTES.home,                    // '/'
  ROUTES.auth.loginProf,          // '/login-professor'
  ROUTES.auth.loginAluno,         // '/login-aluno'
  '/login-professor',             // Compatibilidade
  '/login-aluno',                 // Compatibilidade
  '/professor/login',             // Redirecionamento
  '/aluno/login',                 // Redirecionamento
] as const;
```

### **Rotas Privadas por Tipo de Usuário:**

```typescript
export const PRIVATE_ROUTES = {
  professor: [
    ROUTES.prof.base,             // '/professor'
    ROUTES.prof.resumo,           // '/professor/resumo'
    ROUTES.prof.turmas,           // '/professor/turmas'
    // ... outras rotas de professor
  ],
  aluno: [
    ROUTES.aluno.base,            // '/aluno'
    ROUTES.aluno.resumo,          // '/aluno/resumo'
    ROUTES.aluno.notas,           // '/aluno/notas'
    // ... outras rotas de aluno
  ],
} as const;
```

## 🛠️ Uso

### **Verificação de Rotas Públicas**

```typescript
import { isPublicRoute } from '@/lib/route-guards';

// Verificar se uma rota é pública
const isPublic = isPublicRoute('/login-professor'); // true
const isPrivate = isPublicRoute('/professor/resumo'); // false
```

### **Verificação de Tipo de Usuário**

```typescript
import { isProfessorRoute, isStudentRoute, getUserTypeFromRoute } from '@/lib/route-guards';

// Verificar tipo de rota
const isProf = isProfessorRoute('/professor/resumo'); // true
const isStudent = isStudentRoute('/aluno/notas'); // true

// Detectar tipo de usuário pela rota
const userType = getUserTypeFromRoute('/professor/resumo'); // 'professor'
```

### **Validação de Token**

```typescript
import { shouldCallAuthMe } from '@/lib/route-guards';

// Verificar se deve chamar /auth/me
const token = localStorage.getItem('auth_token');
const shouldCall = shouldCallAuthMe(token); // true se tem token
```

### **Redirecionamento Inteligente**

```typescript
import { shouldRedirectToLogin, shouldNavigate } from '@/lib/route-guards';

// Verificar se deve redirecionar
const redirectInfo = shouldRedirectToLogin('/professor/resumo', null, 'professor');
if (redirectInfo.shouldRedirect) {
  // Redirecionar para redirectInfo.loginRoute
}

// Verificar se deve fazer navigate
const navigateInfo = shouldNavigate('/professor/resumo', null, 'professor');
if (navigateInfo.shouldNavigate) {
  // Fazer navigate para navigateInfo.targetRoute
}
```

## 🔧 API Reference

### **isPublicRoute(pathname: string): boolean**

Verifica se uma rota é pública.

**Parâmetros:**
- `pathname`: Caminho da rota

**Retorna:**
- `boolean`: `true` se é rota pública

**Exemplo:**
```typescript
const isPublic = isPublicRoute('/login-professor'); // true
```

### **isProfessorRoute(pathname: string): boolean**

Verifica se uma rota é de professor.

**Parâmetros:**
- `pathname`: Caminho da rota

**Retorna:**
- `boolean`: `true` se é rota de professor

**Exemplo:**
```typescript
const isProf = isProfessorRoute('/professor/resumo'); // true
```

### **isStudentRoute(pathname: string): boolean**

Verifica se uma rota é de aluno.

**Parâmetros:**
- `pathname`: Caminho da rota

**Retorna:**
- `boolean`: `true` se é rota de aluno

**Exemplo:**
```typescript
const isStudent = isStudentRoute('/aluno/notas'); // true
```

### **getUserTypeFromRoute(pathname: string): 'professor' | 'aluno' | null**

Obtém o tipo de usuário baseado na rota.

**Parâmetros:**
- `pathname`: Caminho da rota

**Retorna:**
- `'professor' | 'aluno' | null`: Tipo de usuário ou null

**Exemplo:**
```typescript
const userType = getUserTypeFromRoute('/professor/resumo'); // 'professor'
```

### **shouldCallAuthMe(token: string | null): boolean**

Verifica se deve chamar /auth/me baseado na presença do token.

**Parâmetros:**
- `token`: Token de autenticação ou null

**Retorna:**
- `boolean`: `true` se deve chamar /auth/me

**Exemplo:**
```typescript
const shouldCall = shouldCallAuthMe(token); // true se tem token
```

### **shouldRedirectToLogin(pathname: string, token: string | null, userType?: 'professor' | 'aluno')**

Verifica se deve redirecionar para login.

**Parâmetros:**
- `pathname`: Caminho da rota
- `token`: Token de autenticação ou null
- `userType`: Tipo de usuário (opcional)

**Retorna:**
- `{ shouldRedirect: boolean; loginRoute?: string }`: Informações de redirecionamento

**Exemplo:**
```typescript
const redirectInfo = shouldRedirectToLogin('/professor/resumo', null, 'professor');
if (redirectInfo.shouldRedirect) {
  // Redirecionar para redirectInfo.loginRoute
}
```

### **shouldNavigate(pathname: string, token: string | null, userType?: 'professor' | 'aluno')**

Verifica se deve fazer navigate.

**Parâmetros:**
- `pathname`: Caminho da rota
- `token`: Token de autenticação ou null
- `userType`: Tipo de usuário (opcional)

**Retorna:**
- `{ shouldNavigate: boolean; targetRoute?: string }`: Informações de navegação

**Exemplo:**
```typescript
const navigateInfo = shouldNavigate('/professor/resumo', null, 'professor');
if (navigateInfo.shouldNavigate) {
  // Fazer navigate para navigateInfo.targetRoute
}
```

### **isRouteAccessibleForUser(pathname: string, userType: 'professor' | 'aluno' | null): boolean**

Verifica se uma rota é acessível para o tipo de usuário.

**Parâmetros:**
- `pathname`: Caminho da rota
- `userType`: Tipo de usuário

**Retorna:**
- `boolean`: `true` se é acessível

**Exemplo:**
```typescript
const isAccessible = isRouteAccessibleForUser('/professor/resumo', 'professor'); // true
```

### **getRouteDebugInfo(pathname: string, token: string | null, userType?: 'professor' | 'aluno')**

Obtém informações de debug sobre uma rota.

**Parâmetros:**
- `pathname`: Caminho da rota
- `token`: Token de autenticação ou null
- `userType`: Tipo de usuário (opcional)

**Retorna:**
- `object`: Informações de debug

**Exemplo:**
```typescript
const debugInfo = getRouteDebugInfo('/professor/resumo', token, 'professor');
console.log(debugInfo);
```

### **useRouteDebug(pathname: string, token: string | null, userType?: 'professor' | 'aluno')**

Hook para debug de rotas (apenas em desenvolvimento).

**Parâmetros:**
- `pathname`: Caminho da rota
- `token`: Token de autenticação ou null
- `userType`: Tipo de usuário (opcional)

**Retorna:**
- `object | null`: Informações de debug ou null

**Exemplo:**
```typescript
const debugInfo = useRouteDebug(location.pathname, token, userType);
```

## 🎯 Integração com Componentes

### **AuthProvider**

```typescript
// AuthContext.tsx
import { shouldCallAuthMe, useRouteDebug } from '@/lib/route-guards';

export function AuthProvider({ children }) {
  const location = useLocation();
  
  // Debug de rotas (apenas em desenvolvimento)
  useRouteDebug(location.pathname, token, state.role);

  useEffect(() => {
    const token = localStorage.getItem(STORAGE_TOKEN_KEY);
    
    // Verificar se deve chamar /auth/me baseado na rota atual
    if (!shouldCallAuthMe(token)) {
      console.info('[AuthProvider] Pulando /auth/me - rota pública ou sem token');
      setState({ loading: false, role: null });
      return;
    }

    // ... resto da lógica
  }, [setToken, location.pathname]);
}
```

### **RequireAuth**

```typescript
// RequireAuth.tsx
import { isPublicRoute, shouldRedirectToLogin, getUserTypeFromRoute } from '@/lib/route-guards';

export default function RequireAuth({ userType }) {
  const location = useLocation();

  // Se é rota pública, nunca redirecionar
  if (isPublicRoute(location.pathname)) {
    console.info('[RequireAuth] Rota pública - não redirecionar:', location.pathname);
    return <Outlet />;
  }

  // Verificar se deve redirecionar baseado na rota e token
  const token = localStorage.getItem(STORAGE_TOKEN_KEY);
  const redirectInfo = shouldRedirectToLogin(location.pathname, token, detectedUserType);
  
  if (redirectInfo.shouldRedirect && redirectInfo.loginRoute) {
    console.info('[RequireAuth] Redirecionando para login:', redirectInfo.loginRoute);
    return <Navigate to={redirectInfo.loginRoute} replace state={{ from: location }} />;
  }

  // ... resto da lógica
}
```

### **ProtectedRoute**

```typescript
// ProtectedRoute.tsx
import { shouldCallAuthMe, isPublicRoute } from '@/lib/route-guards';

export default function ProtectedRoute({ children }) {
  const location = useLocation();

  useEffect(() => {
    // Se é rota pública, não verificar autenticação
    if (isPublicRoute(location.pathname)) {
      setOk(true);
      return;
    }

    // Verificar se deve chamar /auth/me
    const token = localStorage.getItem('auth_token');
    if (!shouldCallAuthMe(token)) {
      setOk(false);
      return;
    }

    // ... resto da lógica
  }, [location.pathname]);
}
```

## 🚨 Solução de Problemas

### **Loops de Navegação**

1. **Verificar se rota está na lista pública:**
   ```typescript
   const isPublic = isPublicRoute('/login-professor');
   console.log('É rota pública:', isPublic);
   ```

2. **Verificar logs no console:**
   ```javascript
   [RouteGuard] Verificando rota pública: /login-professor -> true
   [RequireAuth] Rota pública - não redirecionar: /login-professor
   ```

3. **Verificar se não há navigate em useEffect:**
   ```typescript
   // ❌ Problemático
   useEffect(() => {
     if (!token) {
       navigate('/login-professor'); // Pode causar loop
     }
   }, [token]);

   // ✅ Correto
   useEffect(() => {
     if (!token && !isPublicRoute(location.pathname)) {
       navigate('/login-professor');
     }
   }, [token, location.pathname]);
   ```

### **Chamadas Desnecessárias para /auth/me**

1. **Verificar se token existe:**
   ```typescript
   const token = localStorage.getItem('auth_token');
   const shouldCall = shouldCallAuthMe(token);
   console.log('Deve chamar /auth/me:', shouldCall);
   ```

2. **Verificar logs no console:**
   ```javascript
   [RouteGuard] Deve chamar /auth/me: false (token: false)
   [AuthProvider] Pulando /auth/me - rota pública ou sem token
   ```

### **Redirecionamentos Incorretos**

1. **Verificar tipo de usuário:**
   ```typescript
   const userType = getUserTypeFromRoute('/professor/resumo');
   console.log('Tipo de usuário:', userType); // 'professor'
   ```

2. **Verificar informações de redirecionamento:**
   ```typescript
   const redirectInfo = shouldRedirectToLogin('/professor/resumo', null, 'professor');
   console.log('Deve redirecionar:', redirectInfo);
   ```

## 📊 Monitoramento

### **Console Logs**

```javascript
// Verificação de rota pública
[RouteGuard] Verificando rota pública: /login-professor -> true

// Verificação de tipo de usuário
[RouteGuard] Verificando rota de professor: /professor/resumo -> true

// Verificação de token
[RouteGuard] Deve chamar /auth/me: true (token: true)

// Redirecionamento
[RequireAuth] Redirecionando para login: /login-professor

// Debug completo
[RouteGuard] Debug de rota: {
  pathname: '/professor/resumo',
  token: true,
  userType: 'professor',
  isPublic: false,
  shouldRedirect: false,
  isAccessible: true
}
```

### **Network Tab**

- **Requisições /auth/me**: Devem aparecer apenas quando necessário
- **Redirecionamentos**: Sem loops ou requisições duplicadas
- **Navegação**: Suave entre rotas públicas e privadas

## 🎉 Benefícios

1. **Zero Loops**: Rotas públicas nunca causam redirecionamentos
2. **Performance**: Menos chamadas desnecessárias para /auth/me
3. **Confiabilidade**: Guardas inteligentes previnem erros
4. **Flexibilidade**: Configuração via constantes
5. **Manutenibilidade**: Código centralizado e organizado
6. **Debugging**: Logs claros para troubleshooting

## 🔄 Migração

### **Antes (Problemático)**

```typescript
// ❌ Em cada componente
useEffect(() => {
  if (!token) {
    navigate('/login-professor'); // Pode causar loop
  }
}, [token]);

// ❌ Chamada desnecessária
useEffect(() => {
  api.get('/auth/me'); // Sempre chama, mesmo sem token
}, []);
```

### **Depois (Correto)**

```typescript
// ✅ Usando guardas
useEffect(() => {
  if (!token && !isPublicRoute(location.pathname)) {
    navigate('/login-professor');
  }
}, [token, location.pathname]);

// ✅ Verificação de token
useEffect(() => {
  if (shouldCallAuthMe(token)) {
    api.get('/auth/me');
  }
}, [token]);
```

## 📝 Exemplos Práticos

### **Componente com Guarda de Rota**

```typescript
function MyComponent() {
  const location = useLocation();
  const token = localStorage.getItem('auth_token');

  // Verificar se deve redirecionar
  const redirectInfo = shouldRedirectToLogin(location.pathname, token, 'professor');
  
  if (redirectInfo.shouldRedirect) {
    return <Navigate to={redirectInfo.loginRoute} replace />;
  }

  return <div>Conteúdo protegido</div>;
}
```

### **Hook Personalizado**

```typescript
function useRouteGuard() {
  const location = useLocation();
  const token = localStorage.getItem('auth_token');
  const userType = getUserTypeFromRoute(location.pathname);

  const isPublic = isPublicRoute(location.pathname);
  const shouldCall = shouldCallAuthMe(token);
  const redirectInfo = shouldRedirectToLogin(location.pathname, token, userType);

  return {
    isPublic,
    shouldCall,
    shouldRedirect: redirectInfo.shouldRedirect,
    redirectRoute: redirectInfo.loginRoute,
    userType,
  };
}
```

### **Debug de Rotas**

```typescript
function RouteDebugger() {
  const location = useLocation();
  const token = localStorage.getItem('auth_token');
  const userType = getUserTypeFromRoute(location.pathname);

  const debugInfo = getRouteDebugInfo(location.pathname, token, userType);

  return (
    <div>
      <h3>Debug de Rota</h3>
      <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
    </div>
  );
}
```

---

**Lembre-se**: Os guardas de rota são projetados para prevenir loops de navegação e chamadas desnecessárias. Use-os em todos os componentes que fazem navegação baseada em autenticação.
