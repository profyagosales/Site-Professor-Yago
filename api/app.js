const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const errorHandler = require('./middleware/errorHandler');
const config = require('./config');

// Routes
const healthRoutes = require('./routes/health');
const authRoutes = require('./routes/auth');
const themesRoutes = require('./routes/themes');
const essaysRoutes = require('./routes/essays');
const uploadsRoutes = require('./routes/uploads');

const app = express();

// Middleware
app.use(helmet());
app.use(cors(config.corsOptions));
app.use(express.json());

// Routes
app.use('/health', healthRoutes);
app.use('/auth', authRoutes);
app.use('/themes', themesRoutes);
app.use('/essays', essaysRoutes);
app.use('/uploads', uploadsRoutes);

// Error handler
app.use(errorHandler);

module.exports = app;
