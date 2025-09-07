const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
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
app.use(cookieParser());

// Get API prefix from environment variable or use empty string
const apiPrefix = process.env.API_PREFIX || '';

// Routes
app.use(`${apiPrefix}/health`, healthRoutes);
app.use(`${apiPrefix}/auth`, authRoutes);
app.use(`${apiPrefix}/themes`, themesRoutes);
app.use(`${apiPrefix}/essays`, essaysRoutes);
app.use(`${apiPrefix}/uploads`, uploadsRoutes);

// Error handler
app.use(errorHandler);

module.exports = app;
