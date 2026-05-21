const dotenv = require('dotenv');

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';

const normalizeOrigin = (origin) => origin.trim().replace(/\/+$/, '');

const parseList = (value = '') =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const validateEnv = () => {
  const required = ['MONGODB_URI', 'BETTER_AUTH_SECRET', 'JWT_SECRET'];
  const productionRequired = ['CLIENT_URL'];
  const envKeys = isProduction ? [...required, ...productionRequired] : required;
  const missing = envKeys.filter((key) => !process.env[key]);
  const betterAuthSecret = process.env.BETTER_AUTH_SECRET || '';
  const jwtSecret = process.env.JWT_SECRET || betterAuthSecret;
  const weakSecret =
    (betterAuthSecret && betterAuthSecret.length < 32) ||
    (jwtSecret && jwtSecret.length < 32);

  if (missing.length > 0) {
    const message = `Missing env vars: ${missing.join(', ')}`;
    console.error(`[STARTUP] ${message}`);
    if (isProduction) throw new Error(message);
  }

  if (weakSecret) {
    const message = 'BETTER_AUTH_SECRET and JWT_SECRET must be at least 32 characters long when configured';
    console.error(`[STARTUP] ${message}`);
    if (isProduction) throw new Error(message);
  }
};

const allowedOrigins = parseList(process.env.CLIENT_URL || 'http://localhost:3000')
  .map(normalizeOrigin);

module.exports = {
  isProduction,
  port: process.env.PORT || 5000,
  allowedOrigins,
  normalizeOrigin,
  validateEnv,
};
