const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();
const connectDB = require('./config/db');
const notificationScheduler = require('./services/notificationScheduler');

const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const emailRoutes = require('./routes/email');
const classesRoutes = require('./routes/classes');
const studentsRoutes = require('./routes/students');
const evaluationRoutes = require('./routes/evaluations');
const gradesRoutes = require('./routes/grades');
const cadernoRoutes = require('./routes/caderno');
const gabaritoRoutes = require('./routes/gabaritos');
const omrRoutes = require('./routes/omr');
const redacoesRoutes = require('./routes/redacoes');

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use('/auth', authRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/email', emailRoutes);
app.use('/classes', classesRoutes);
app.use('/students', studentsRoutes);
app.use('/evaluations', evaluationRoutes);
app.use('/grades', gradesRoutes);
app.use('/caderno', cadernoRoutes);
app.use('/gabaritos', gabaritoRoutes);
app.use('/omr', omrRoutes);
app.use('/redacoes', redacoesRoutes);

connectDB().then(() => {
  notificationScheduler.loadScheduledNotifications();
});

app.get('/', (req, res) => {
  res.send('API running');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
