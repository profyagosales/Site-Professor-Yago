# Deploy do Frontend (Vercel)

Este projeto **não usa mais GitHub Actions para deploy**.  
Escolha **uma** destas formas:

- **A) Vercel Git (recomendado)** — a Vercel builda todo push na `main`.
- **B) Vercel CLI via Codespaces** — você dispara o deploy manualmente.

---

## Pré-requisitos (válidos para A e B)

- Projeto único na Vercel: **site-professor-yago-frontend**  
  (se existir um projeto chamado apenas **frontend**, delete no painel para evitar confusões)
- **Root Directory** no projeto Vercel: `frontend/`
- **Node.js Version** no projeto Vercel: **20.x**
- Variável de ambiente presente no projeto Vercel:
  - `VITE_API_BASE_URL=https://api.professoryagosales.com.br`
  - marcada para **Production / Preview / Development**

> **Dica CORS (backend)**: aceite também *previews* do Vercel (p. ex. `https://*-site-professor-yago-frontend-*.vercel.app`).  
> Uma regex comum é: `^https:\/\/.*\.vercel\.app$`

---

## A) Deploy automático com **Vercel Git** (recomendado)

1. Painel Vercel → **site-professor-yago-frontend → Settings → Git**
2. **Connect Git Repository** → `profyagosales/Site-Professor-Yago`
3. **Production Branch**: `main`
4. **Root Directory**: `frontend/`
5. Confirme **Node 20.x** e `VITE_API_BASE_URL`.

**Como usar**: faça `git push` na `main`. A Vercel builda e publica.

---

## B) Deploy manual com **Vercel CLI** (Codespaces)

> Rode **dentro de `frontend/`**. Não use `--prebuilt` (deixe a Vercel buildar).

### 1) Preparar credenciais (uma vez por sessão)

```bash
cd /workspaces/Site-Professor-Yago/frontend

# Preeencha com os SEUS valores (painel da Vercel: Team ID, Project ID e Token)
export VERCEL_ORG_ID="team_xxxxxxxxxxxxx"
export VERCEL_PROJECT_ID="prj_xxxxxxxxxxxxx"
export VERCEL_TOKEN="xxxxxxxxxxxxxxxxxx"
```

### 2) Sincronizar config do projeto (link limpo)
```bash
rm -rf .vercel
npx -y vercel@25 pull --yes --environment=production \
  --token "$VERCEL_TOKEN" --scope "$VERCEL_ORG_ID"
```

Se perguntar algo:

Use existing project

Scope: profyagosales

Project: site-professor-yago-frontend

Root directory: frontend/

### 3) (Opcional) Sanity local do Vite
```bash
cd /workspaces/Site-Professor-Yago
npm ci
npm --prefix frontend run build
```

### 4) Deploy de produção
```bash
cd /workspaces/Site-Professor-Yago/frontend
npx -y vercel@25 deploy --prod \
  --token "$VERCEL_TOKEN" --scope "$VERCEL_ORG_ID"
```

### (Opcional) Preview manual
```bash
npx -y vercel@25 \
  --token "$VERCEL_TOKEN" --scope "$VERCEL_ORG_ID"
```

---

## Erros comuns e soluções

**“Could not retrieve Project Settings”**  
→ `rm -rf .vercel && vercel pull` com ORG/PROJECT corretos. Certifique os IDs do projeto `site-professor-yago-frontend`.

**“--prebuilt without .vercel/output” / Node 16 exigido pelo vercel build**  
→ Não use `--prebuilt`/`vercel build`. Deixe a Vercel buildar no deploy.

**Criação de projetos duplicados**  
→ Sempre escolha “Use existing project” ao rodar `vercel pull`/`vercel deploy`.  
→ Apague projetos “fantasmas” (como `frontend`) no painel.

**Previews bloqueados por CORS**  
→ Garanta uma regra que aceite `*.vercel.app` do projeto de preview.

**PDF 401/403**  
→ Verifique se o fluxo usa `file-token` correto e se o endpoint público não exige Authorization quando `file-token` é usado.

---

## Scripts úteis (opcional)

Adicione no `package.json` raiz:

```json
{
  "scripts": {
    "vercel:pull": "cd frontend && vercel pull --yes --environment=production",
    "vercel:deploy": "cd frontend && vercel deploy --prod"
  }
}
```

**Uso:**

```bash
export VERCEL_ORG_ID=...
export VERCEL_PROJECT_ID=...
export VERCEL_TOKEN=...
npm run vercel:pull
npm run vercel:deploy
```

---

## TL;DR

Recomendado: Vercel Git conectado à `main` com root `frontend/`.

Manual: `vercel pull` (limpo) → `vercel deploy --prod`.

Evite `--prebuilt`/`vercel build`. Use Node 20.x no projeto Vercel.
