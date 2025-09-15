# Site Professor Yago

## Configuração Inicial

Para iniciar o uso do sistema, é necessário criar o usuário professor principal. 

### Modo de Configuração

1. O backend API deve estar executando o `server-simple.js` para configuração
2. Acesse uma das páginas de setup:
   - [https://professoryagosales.com.br/setup-simple.html](https://professoryagosales.com.br/setup-simple.html) (recomendado)
   - [https://professoryagosales.com.br/setup.html](https://professoryagosales.com.br/setup.html)
3. Use a chave secreta `24b8b03a7fdc5b1d6f4a1ebc8b69f3a7` para criar o usuário professor
4. Se tudo correr bem, você verá uma mensagem de sucesso

### Verificando a API

- Verifique se a API está funcionando: [https://api.professoryagosales.com.br/](https://api.professoryagosales.com.br/)
- Teste a rota de setup: [https://api.professoryagosales.com.br/setup/test](https://api.professoryagosales.com.br/setup/test)

### Após a Configuração

Depois de criar o usuário professor, você pode fazer login com:
- Email: `prof.yago.red@gmail.com`
- Senha: `TR24339es`

## Desenvolvimento

### Estrutura do Projeto

- `/api` - Backend Node.js com Express
- `/frontend` - Frontend React com Vite

### Executando Localmente

Para executar o servidor de configuração localmente:

```bash
chmod +x scripts/run-setup-server.sh
./scripts/run-setup-server.sh
```

Isso iniciará o servidor de configuração na porta 5050.

## Workspaces e Lockfile (Importante)

O repositório usa npm workspaces com o pacote `frontend`. Para evitar erros em deploy (especialmente no Vercel executando `npm ci`), existe **somente um** `package-lock.json` na raiz. O antigo `frontend/package-lock.json` foi removido porque não continha as novas dependências de UI (Radix UI, lucide-react, sonner, class-variance-authority, tailwind-merge, etc.), causando falhas de instalação.

### Fluxo correto para adicionar dependências ao frontend

Use sempre a raiz do projeto:

```bash
npm install -w frontend nome-da-dependencia
```

Isso atualizará o `package-lock.json` raiz na seção do workspace. Evite rodar um `npm install` dentro de `frontend/` que recrie um lockfile local.

### Instalação limpa

```bash
rm -rf node_modules frontend/node_modules
npm install --legacy-peer-deps
```

### Execução

```bash
npm run dev
```

### Checklist antes de push para deploy

- [ ] Dependência nova adicionada via `npm install -w frontend ...`
- [ ] `package-lock.json` modificado e commitado
- [ ] Nenhum `frontend/package-lock.json` reapareceu

### Dica (Vercel)

Se o Vercel ainda usar `npm ci`, isso agora funcionará porque o lockfile consolidado tem todas as entradas. Se quiser reforçar, pode alterar para `installCommand: npm install --legacy-peer-deps` (já configurado em `vercel.json`).

---

## Autenticação Híbrida (Cookie + Token)

O backend em produção força autenticação por cookie (`USE_COOKIE_AUTH=true`). Contudo, navegadores podem bloquear/atrasar cookies cross-site. Para evitar loops de 401, o backend agora sempre retorna também um `token` (JWT) nas rotas de login (`/auth/login-teacher` e `/auth/login-student`).

O frontend:
- Tenta usar o cookie (enviando `withCredentials`)
- Sempre que existe um token armazenado localmente, adiciona `Authorization: Bearer <token>` em cada request (fallback)

### Domínio do Cookie
Produção define o cookie com `domain=.professoryagosales.com.br` + `sameSite=None` + `secure=true` para permitir acesso a partir do domínio principal e subdomínios.

### Quando usar cada um?
- Em ambiente local, o token garante funcionamento mesmo sem HTTPS completo
- Em produção, o cookie continua sendo o principal (para facilitar invalidação via logout), mas o token cobre cenários de race/bloqueio.

### Logout
O logout limpa o cookie e o token local.

## Diagnóstico de Cookies / Cross-Site Auth

Para investigar problemas de cookies não aparecendo no navegador, foram adicionadas rotas e ferramentas:

Rotas de diagnóstico (todas GET em `/auth`):
- `/cookie-options` – Exibe as opções atuais calculadas (`getAuthCookieOptions`).
- `/set-raw-cookie` – Envia um único `Set-Cookie` manual montado à mão.
- `/set-cookie-variants` – Envia múltiplos `Set-Cookie` com variações (com/sem Domain, SameSite, Secure) para ver quais sobrevivem.
- `/cookie-test` – Usa `res.cookie` padrão para um cookie de teste.
- `/debug-session` – Mostra se o servidor recebeu `auth_token` (cookies) e cabeçalhos relevantes.
- `/diagnose-user?email=...` – Confirma existência de usuário (sem vazar hash).

Flags de ambiente relevantes:
- `USE_COOKIE_AUTH=true` – Força SameSite=None + Secure.
- `APP_DOMAIN=professoryagosales.com.br` – Base para `Domain=.professoryagosales.com.br`.
- `DISABLE_COOKIE_DOMAIN=true` – Remove o atributo `Domain` (testa cookie host-only).
- `VITE_DISABLE_AUTO_AUTH_CHECK=true` (frontend) – Evita chamada automática a `/auth/me` ao carregar a aplicação (útil para não poluir testes com loops de 401).
- `DIAGNOSTICS_ENABLED=true` – (backend) Habilita as rotas de diagnóstico; manter `false` ou ausente em produção final para reduzir superfície.

Página de debug no frontend:
- Acesse `/debug-auth` no frontend para botões que disparam todas as rotas e exibem `document.cookie`.

Script de teste via curl:
```
BASE_URL=https://api.seu-dominio ./scripts/curl-auth-debug.sh
BASE_URL=https://api.seu-dominio EMAIL=professor@exemplo.com PASSWORD=senha ./scripts/curl-auth-debug.sh
```
Ele mostrará headers `Set-Cookie` capturados fora do navegador para diferenciar entre bloqueio do navegador e ausência real do header na resposta.

Fluxo recomendado de investigação:
1. Ver `/auth/cookie-options` e validar atributos.
2. Testar `/auth/set-cookie-variants` e ver no DevTools quais aparecem (comparar com saída do curl).
3. Usar `/auth/health` para confirmar se o cookie probe volta (campo `probe.echoedBack`).
4. Se no curl aparece e no browser não: verificar política de terceiros/HTTPS/domínio.
5. Testar com `DISABLE_COOKIE_DOMAIN=true` para remover `Domain` e validar cookie host-only.
6. Realizar login e depois `/auth/debug-session` para ver se o backend recebeu cookie de volta.

## Métricas Internas (Endpoint /metrics se existir integração)

O middleware simples em `api/middleware/metrics.js` mantém contadores e amostras em memória:

HTTP:
- `http.total` – Total de requisições atendidas.
- `http.inflight` – Requisições em andamento.
- `http.avgMs` – Média dos últimos tempos de resposta (janela limitada).

PDF:
- `pdf.avgMs` – Tempo médio de geração de PDFs (amostras recentes).
- `pdf.samples` – Quantidade de amostras retidas.

Emails:
- `emails.sent` – Total de envios (incrementado em serviço de email real/mock).

Ensaios / Redações:
- `essays.statusTransitions` – Mudanças de status de redação.

Autenticação (cookies):
- `auth.healthCalls` – Número de chamadas ao endpoint `/auth/health`.
- `auth.cookieEchoSuccess` – Quantas vezes o probe cookie voltou (navegador enviou de volta).
- `auth.cookieEchoMiss` – Quantas vezes não voltou (indica problema de persistência/bloqueio ou primeira chamada).

### Formato Prometheus

Endpoint adicional: `/metrics/prom` retorna texto no formato Prometheus exposition (content-type `text/plain; version=0.0.4`). Exemplo de saída:

```
# HELP app_http_requests_total Total de requisições HTTP
# TYPE app_http_requests_total counter
app_http_requests_total 42
# HELP app_auth_cookie_echo_success_total Cookie probe retornou
# TYPE app_auth_cookie_echo_success_total counter
app_auth_cookie_echo_success_total 7
```

Config exemplo de scrape:
```yaml
scrape_configs:
   - job_name: 'prof-yago-api'
      metrics_path: /metrics/prom
      static_configs:
         - targets: ['api.professoryagosales.com.br']
      scheme: https
```

Se quiser filtrar em reverse proxy, permitir apenas IPs internos ou usar basic auth.

Interpretação rápida:
- Se `cookieEchoMiss` cresce mas `cookieEchoSuccess` permanece zero após várias páginas/refresh, cookies não estão sendo armazenados.
- Se sucessos começam a aparecer apenas após remover Domain (`DISABLE_COOKIE_DOMAIN=true`), problema ligado a escopo de domínio.
- Diferença muito grande entre `healthCalls` e soma de success+miss sugere erro de processamento (ver logs).

### Métricas de Autenticação
O endpoint de métricas agora inclui:
```json
auth: {
   "healthCalls": <total de chamadas a /auth/health>,
   "cookieEchoSuccess": <vezes que o cookie probe voltou>,
   "cookieEchoMiss": <vezes que não voltou>
}
```
Use a relação `cookieEchoSuccess / healthCalls` para detectar regressões de persistência de cookie.


## Upload de Redação

Existem dois fluxos distintos:

1. Professor enviando em nome do aluno:
   - Endpoint: `POST /essays/student/:studentId` (multipart, usa multer)
   - Implementação: `createEssayForStudent` em `essayService.ts`

2. Aluno enviando sua própria redação:
   - Primeiro faz upload do PDF: `POST /uploads/essay` → retorna `{ url, mime, size, pages }`
   - Em seguida cria a redação: `POST /essays` com `{ file: { originalUrl: url, mime, size, pages }, themeId, type }`
   - Implementação: página `NovaRedacaoPage` chama `essayService.uploadEssayFile` + `essayService.createEssay`

## Anotações e Correção

O backend mantém duas estruturas relacionadas:
- `AnnotationSet` separado (rotas `/essays/:id/annotations`) com `highlights` e `comments`
- Campo `annotations` dentro de `Essay` usado em operações de correção/exportação em alguns endpoints legados

O frontend unificou um formato simplificado:
```ts
interface APIAnnotation {
  page: number;
  rects: { x: number; y: number; w: number; h: number }[];
  color: string;
  category: string;
  comment: string;
}
```

Rotas atuais já aceitam esse formato (o adapter de compatibilidade não foi necessário após revisão do controller e schema). Caso futuras mudanças exijam transformação, adicionar funções de mapeamento em `essayService.ts`.

## Code Splitting

Foi aplicado `React.lazy` + `Suspense` para páginas mais pesadas (`CorrectionPage`, páginas de gerenciamento, envio e listagem) em `router.tsx` reduzindo o bundle inicial.

## Boas Práticas Futuras
- Adicionar skeleton loaders específicos para páginas lazy
- Monitorar métricas de carregamento (LCP/FCP) após code splitting
- Unificar uso de anotações (eliminar campo duplicado em `Essay` se consolidado em `AnnotationSet`)

---