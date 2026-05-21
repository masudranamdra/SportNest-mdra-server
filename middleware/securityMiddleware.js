const cors = require('cors');
const { allowedOrigins, isProduction, normalizeOrigin } = require('../config/env');

const securityHeaders = (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
};

const corsMiddleware = cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(normalizeOrigin(origin))) {
      return callback(null, true);
    }

    const error = new Error('Not allowed by CORS');
    error.statusCode = 403;
    return callback(error);
  },
  credentials: true,
});

const csrfOriginGuard = (req, res, next) => {
  const origin = req.get('origin');
  const unsafeMethod = !['GET', 'HEAD', 'OPTIONS'].includes(req.method);

  if (unsafeMethod && origin && !allowedOrigins.includes(normalizeOrigin(origin))) {
    return res.status(403).json({
      success: false,
      message: 'Request origin is not allowed',
    });
  }

  return next();
};

const clearLegacyAuthCookies = (req, res, next) => {
  const clearOptions = {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction,
    path: '/',
  };

  [
    'next-auth.session-token',
    '__Secure-next-auth.session-token',
    'next-auth.csrf-token',
    '__Host-next-auth.csrf-token',
  ].forEach((name) => {
    if (req.cookies?.[name]) res.clearCookie(name, clearOptions);
  });

  next();
};

module.exports = {
  securityHeaders,
  corsMiddleware,
  csrfOriginGuard,
  clearLegacyAuthCookies,
};
