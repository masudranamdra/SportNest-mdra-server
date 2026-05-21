const express = require('express');
const cookieParser = require('cookie-parser');
const apiRoutes = require('./routes');
const { validateEnv } = require('./config/env');
const { initDB } = require('./middleware/dbMiddleware');
const apiLimiter = require('./middleware/rateLimitMiddleware');
const {
  securityHeaders,
  corsMiddleware,
  csrfOriginGuard,
  clearLegacyAuthCookies,
} = require('./middleware/securityMiddleware');
const { errorHandler } = require('./middleware/errorMiddleware');

validateEnv();

const app = express();

app.set('trust proxy', 1);

app.use(securityHeaders);
app.use(corsMiddleware);
app.use(apiLimiter);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());
app.use(csrfOriginGuard);
app.use(clearLegacyAuthCookies);

app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'SportNest API Server is running smoothly!',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api', apiRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.originalUrl}`,
  });
});

app.use(errorHandler);

initDB().catch(() => {
  // Request middleware retries and returns a controlled 503 if MongoDB is still unavailable.
});

module.exports = app;
