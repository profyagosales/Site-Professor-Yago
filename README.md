# Site-Professor-Yago

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

## Production

1. Build the frontend:
   ```bash
   npm run build
   ```
2. Serve the backend:
   ```bash
   node backend/server.js
   ```

## Hosting Tips

- **Backend**: Platforms like Heroku or Render work well for hosting the Node.js server.
- **Frontend**: Deploy the built frontend on services such as Vercel.
- **DNS & CORS**: When frontend and backend are hosted separately, configure DNS so the frontend uses your `APP_DOMAIN` and ensure the backend allows that origin in its CORS settings.

