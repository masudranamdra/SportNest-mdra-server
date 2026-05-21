const User = require('../models/User');
const bcryptjs = require('bcryptjs');
const crypto = require('crypto');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const DEFAULT_SESSION_DAYS = 30;

// Helper to generate session token
const generateSessionToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

const getSessionTtlMs = () => {
  const days = Number(process.env.SESSION_TTL_DAYS || DEFAULT_SESSION_DAYS);
  const normalizedDays = Number.isFinite(days) && days > 0 ? days : DEFAULT_SESSION_DAYS;
  return normalizedDays * 24 * 60 * 60 * 1000;
};

const hashSessionToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

// Helper to sign session cookie
const signSessionCookie = (token) => {
  const signature = crypto
    .createHmac('sha256', process.env.BETTER_AUTH_SECRET)
    .update(token)
    .digest('base64url');
  return `${token}.${signature}`;
};

const getCookieOptions = (maxAge = getSessionTtlMs()) => {
  const sameSite = (process.env.COOKIE_SAME_SITE || 'lax').toLowerCase();
  const normalizedSameSite = ['strict', 'lax', 'none'].includes(sameSite) ? sameSite : 'lax';

  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production' || normalizedSameSite === 'none',
    sameSite: normalizedSameSite,
    maxAge,
    path: '/',
  };
};

const createSession = async (userId) => {
  const sessionToken = generateSessionToken();
  const expiresAt = new Date(Date.now() + getSessionTtlMs());
  const Session = mongoose.connection.db.collection('session');

  await Session.insertOne({
    tokenHash: hashSessionToken(sessionToken),
    userId,
    expiresAt,
    createdAt: new Date(),
  });

  return { sessionToken, signedCookie: signSessionCookie(sessionToken) };
};

const setSessionCookie = (res, signedCookie) => {
  res.cookie('better-auth.session_token', signedCookie, getCookieOptions());
};

const verifyGoogleIdToken = async (idToken) => {
  if (!process.env.GOOGLE_CLIENT_ID) {
    const error = new Error('Google authentication is not configured');
    error.statusCode = 500;
    throw error;
  }

  const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`, {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    resStatusError(401, 'Invalid Google token');
  }

  const payload = await response.json();
  const validIssuer = payload.iss === 'accounts.google.com' || payload.iss === 'https://accounts.google.com';
  const emailVerified = payload.email_verified === true || payload.email_verified === 'true';

  if (!validIssuer || payload.aud !== process.env.GOOGLE_CLIENT_ID || !emailVerified || !payload.email || !payload.sub) {
    resStatusError(401, 'Invalid Google token claims');
  }

  return {
    email: payload.email.toLowerCase(),
    name: payload.name || 'Google User',
    picture: payload.picture,
    sub: payload.sub,
  };
};

const resStatusError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  throw error;
};

const normalizeEmail = (email) => (typeof email === 'string' ? email.trim().toLowerCase() : '');

const signJwt = (user) => jwt.sign(
  {
    sub: user._id.toString(),
    email: user.email,
    role: user.role,
  },
  process.env.JWT_SECRET || process.env.BETTER_AUTH_SECRET,
  {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    issuer: 'sportnest-api',
    audience: 'sportnest-client',
  }
);

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    const normalizedEmail = normalizeEmail(email);

    // Validation
    if (!name || !normalizedEmail || !password) {
      res.status(400);
      throw new Error('Please provide name, email, and password');
    }

    if (password.length < 8) {
      res.status(400);
      throw new Error('Password must be at least 8 characters long');
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      res.status(400);
      throw new Error('Email already exists or invalid details');
    }

    // Hash password
    const salt = await bcryptjs.genSalt(10);
    const hashedPassword = await bcryptjs.hash(password, salt);

    // Create user
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      emailVerified: false,
    });

    const { signedCookie } = await createSession(user._id);
    setSessionCookie(res, signedCookie);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        photoURL: user.photoURL,
        role: user.role,
      },
      token: signJwt(user),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = normalizeEmail(email);

    // Validation
    if (!normalizedEmail || !password) {
      res.status(400);
      throw new Error('Please provide email and password');
    }

    // Find user
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      res.status(401);
      throw new Error('Invalid email or password');
    }

    if (!user.password) {
      res.status(401);
      throw new Error('This account was created with OAuth. Please login with the original provider.');
    }

    // Check password
    const isPasswordValid = await bcryptjs.compare(password, user.password);
    if (!isPasswordValid) {
      res.status(401);
      throw new Error('Invalid email or password');
    }

    const { signedCookie } = await createSession(user._id);
    setSessionCookie(res, signedCookie);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        photoURL: user.photoURL,
        role: user.role,
        isAdmin: user.isAdmin(),
      },
      token: signJwt(user),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get currently logged in user
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    
    res.status(200).json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        photoURL: user.photoURL || user.image,
        role: user.role,
        isAdmin: user.isAdmin(),
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Google OAuth callback
// @route   POST /api/auth/google
// @access  Public
const googleAuth = async (req, res, next) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      res.status(400);
      throw new Error('Missing Google idToken');
    }

    const { email, name, picture, sub } = await verifyGoogleIdToken(idToken);

    // Find or create user
    let user = await User.findOne({ email });

    if (!user) {
      // Create new user from Google profile
      user = await User.create({
        name: name || 'Google User',
        email,
        photoURL: picture || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200',
        image: picture,
        googleId: sub,
        emailVerified: true,
      });

      if (process.env.NODE_ENV !== 'production') {
        console.log(`[AUTH] New user created from Google: ${email}`);
      }
    } else if (!user.googleId) {
      // Update existing user with Google ID
      user.googleId = sub;
      if (picture && !user.photoURL) {
        user.photoURL = picture;
      }
      if (picture && !user.image) {
        user.image = picture;
      }
      await user.save();
    }

    const { signedCookie } = await createSession(user._id);
    setSessionCookie(res, signedCookie);

    res.status(200).json({
      success: true,
      message: 'Google authentication successful',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        photoURL: user.photoURL,
        role: user.role,
        isAdmin: user.isAdmin(),
      },
      token: signJwt(user),
    });
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[AUTH] Google auth error:', error.message);
    }
    next(error);
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
const logout = async (req, res, next) => {
  try {
    // Remove session from database
    if (req.session) {
      const Session = mongoose.connection.db.collection('session');
      const sessionFilters = [];

      if (req.sessionTokenHash) sessionFilters.push({ tokenHash: req.sessionTokenHash });
      if (req.session.token) sessionFilters.push({ token: req.session.token });

      if (sessionFilters.length > 0) {
        await Session.deleteOne({ $or: sessionFilters });
      }
    }

    // Clear cookies
    const clearOptions = getCookieOptions(0);
    res.clearCookie('better-auth.session_token', clearOptions);
    res.clearCookie('__Secure-better-auth.session_token', clearOptions);

    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  getMe,
  googleAuth,
  logout,
};
