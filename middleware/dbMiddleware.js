const connectDB = require('../config/db');

let dbConnectPromise = null;

const initDB = async () => {
  if (!dbConnectPromise) {
    dbConnectPromise = connectDB().catch((error) => {
      console.error(`[DB] Database initialization failed: ${error.message}`);
      dbConnectPromise = null;
      throw error;
    });
  }

  return dbConnectPromise;
};

const ensureDBReady = async (req, res, next) => {
  try {
    await initDB();
    return next();
  } catch (error) {
    return res.status(503).json({
      success: false,
      message: 'Service temporarily unavailable. Database connection is not ready.',
    });
  }
};

module.exports = {
  initDB,
  ensureDBReady,
};
