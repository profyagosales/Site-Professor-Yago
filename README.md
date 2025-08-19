# Site-Professor-Yago

Consulte o [Guia do Usuário](./USER_GUIDE.md) para entender os fluxos de login, envio de redação, correção e visualização de notas.

## Required Environment Variables

| Variable | Purpose |
|----------|---------|
| `MONGODB_URI` | Connection string for MongoDB. |
| `JWT_SECRET` | Secret key for signing JSON Web Tokens. |
| `SMTP_HOST` | Hostname of the SMTP server used to send emails. |
| `SMTP_USER` | Username for the SMTP server. |
| `SMTP_PASS` | Password for the SMTP server. |
| `APP_DOMAIN` | Public domain where the application is served. |
| `SMTP_PORT` | (Optional) Port for the SMTP server. |
| `SMTP_FROM` | (Optional) Email address used in the "from" field. |

## Exemplo de .env (Produção)

Crie um arquivo `.env` com os valores reais do ambiente:

```env
MONGODB_URI=mongodb+srv://usuario:senha@cluster/app
JWT_SECRET=sua_chave_ultrasecreta
SMTP_HOST=smtp.exemplo.com
SMTP_PORT=587
SMTP_USER=usuario
SMTP_PASS=senha
SMTP_FROM=no-reply@exemplo.com
APP_DOMAIN=https://app.exemplo.com
```

## Local Setup

1. Install dependencies for both the frontend and backend:
   ```bash
   npm install --prefix frontend
   npm install --prefix backend
   ```
2. Run the development servers from the project root:
   ```bash
   npm run dev
   ```

## Rodando testes

Execute todos os testes do projeto:

```bash
npm test
```

Ou execute separadamente para backend e frontend:

```bash
npm test --prefix backend
npm test --prefix frontend
```

## Production

1. Build the frontend:
   ```bash
   npm run build
   ```
2. Certifique-se de que as variáveis de ambiente estejam definidas (veja o exemplo de `.env`).
3. Execute o servidor Node:
   ```bash
   node backend/server.js
   ```

## Hosting Tips

- **Backend**: Platforms like Heroku or Render work well for hosting the Node.js server.
- **Frontend**: Deploy the built frontend on services such as Vercel.
- **DNS & CORS**: When frontend and backend are hosted separately, configure DNS so the frontend uses your `APP_DOMAIN` and ensure the backend allows that origin in its CORS settings.


## Deployment Checklist

Refer to [DEPLOY_CHECKLIST.md](./DEPLOY_CHECKLIST.md) for steps to validate navigation, gabarito handling, redação workflows, notifications, and branding before deploying to staging or production.
