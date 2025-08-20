require('dotenv').config();
const { app } = require('./app');
const connectDB = require('./config/db');
const notificationScheduler = require('./services/notificationScheduler');

const PORT = process.env.PORT || 5050;

connectDB().then(() => {
  notificationScheduler.loadScheduledNotifications();
  if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });
  }
});
