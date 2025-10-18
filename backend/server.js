require('dotenv').config();
const cookieParser = require('cookie-parser');
const { app } = require('./app');
const connectDB = require('./config/db');
const notificationScheduler = require('./services/notificationScheduler');

const PORT = process.env.PORT || 5050;

app.set('trust proxy', 1);

if (!app?._router?.stack?.some?.((layer) => layer?.handle?.name === 'cookieParser')) {
  app.use(cookieParser());
}

// Render expects the process to respond on the port it injects via PORT.
// Adiciona verificação simples de saúde sem depender de middlewares externos.
app.get('/api/healthz', (_req, res) => res.status(200).json({ ok: true }));

connectDB().then(() => {
  notificationScheduler.loadScheduledNotifications();
  if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`[boot] API listening on ${PORT}`);
    });
  }
});
