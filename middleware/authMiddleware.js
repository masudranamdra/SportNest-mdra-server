const User = require('../models/User');
const mongoose = require('mongoose');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const getSessionCookie = (cookies = {}) =>
  cookies['better-auth.session_token'] ||
  cookies['__Secure-better-auth.session_token'] ||
  cookies['better-auth-session_token'] ||
  cookies['__Secure-better-auth-session_token'];

const hashSessionToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const getBearerToken = (req) => {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  return scheme?.toLowerCase() === 'bearer' && token ? token : null;
};

const verifySignedCookie = (cookieValue) => {
  if (!cookieValue || !process.env.BETTER_AUTH_SECRET) return null;

  const signatureStart = cookieValue.lastIndexOf('.');
  if (signatureStart < 1) return null;

  const token = cookieValue.slice(0, signatureStart);
  const signature = cookieValue.slice(signatureStart + 1);
  
  try {
    const expected = crypto
      .createHmac('sha256', process.env.BETTER_AUTH_SECRET)
      .update(token)
      .digest('base64url');
    const legacyExpected = crypto
      .createHmac('sha256', process.env.BETTER_AUTH_SECRET)
      .update(token)
      .digest('base64');

    const signatureBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);
    const legacyExpectedBuffer = Buffer.from(legacyExpected);

    if (signatureBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
      return token;
    }

    if (
      signatureBuffer.length === legacyExpectedBuffer.length &&
      crypto.timingSafeEqual(signatureBuffer, legacyExpectedBuffer)
    ) {
      return token;
    }

    return null;
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[AUTH] Cookie verification error:', error.message);
    }
    return null;
  }
};

const protect = async (req, res, next) => {
  try {
    // Check database connection first
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'Service temporarily unavailable. Database connection is not ready.',
      });
    }

    const bearerToken = getBearerToken(req);
    const signedSessionCookie = getSessionCookie(req.cookies);
    
    if (!signedSessionCookie && !bearerToken) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('[AUTH] No session cookie or bearer token found');
      }
      return res.status(401).json({
        success: false,
        message: 'Not authorized, login required',
      });
    }

    if (bearerToken && !signedSessionCookie) {
      const decoded = jwt.verify(
        bearerToken,
        process.env.JWT_SECRET || process.env.BETTER_AUTH_SECRET,
        {
          issuer: 'sportnest-api',
          audience: 'sportnest-client',
        }
      );
      const user = await User.findById(decoded.sub).select('-password');

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Not authorized, user not found',
        });
      }

      req.user = user;
      return next();
    }

    const sessionToken = verifySignedCookie(signedSessionCookie);
    
    if (!sessionToken) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('[AUTH] Invalid session cookie signature');
      }
      return res.status(401).json({
        success: false,
        message: 'Not authorized, invalid session',
      });
    }

    const Session = mongoose.connection.db.collection('session');
    const sessionTokenHash = hashSessionToken(sessionToken);
    const session = await Session.findOne({
      $or: [
        { tokenHash: sessionTokenHash },
        { token: sessionToken },
      ],
    });
    
    if (!session) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('[AUTH] Session not found in database');
      }
      return res.status(401).json({
        success: false,
        message: 'Session not found or invalid',
      });
    }

    const expiresAt = new Date(session.expiresAt);
    if (expiresAt < new Date()) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('[AUTH] Session has expired');
      }
      return res.status(401).json({
        success: false,
        message: 'Session has expired',
      });
    }

    const user = await User.findById(session.userId).select('-password');
    
    if (!user) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('[AUTH] User not found for session');
      }
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    req.user = user;
    req.session = session;
    req.sessionTokenHash = sessionTokenHash;
    next();
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[AUTH] Error:', error.message);
    }
    return res.status(401).json({
      success: false,
      message: 'Not authorized, authentication error',
    });
  }
};

// Middleware to check if user is admin
const isAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized, login required',
    });
  }

  if (!req.user.isAdmin()) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized, admin access required',
    });
  }

  next();
};

module.exports = { protect, isAdmin };
