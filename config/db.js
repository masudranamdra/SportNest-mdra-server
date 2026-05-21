const mongoose = require('mongoose');

// Track connection state to prevent multiple connect attempts in serverless
let isConnecting = false;
let connectionPromise = null;
let listenersRegistered = false;
let indexesEnsured = false;

mongoose.set('bufferCommands', false);

const registerConnectionListeners = () => {
  if (listenersRegistered) return;

  mongoose.connection.on('disconnected', () => {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[DB] MongoDB disconnected. Mongoose will attempt to reconnect.');
    }
  });

  mongoose.connection.on('error', (error) => {
    if (process.env.NODE_ENV !== 'production') {
      console.error(`[DB] MongoDB runtime error: ${error.message}`);
    }
  });

  listenersRegistered = true;
};

const ensureRuntimeIndexes = async () => {
  if (indexesEnsured) return;

  const db = mongoose.connection.db;
  if (!db) return;

  const ensureIndex = async (collection, index, options) => {
    try {
      await db.collection(collection).createIndex(index, options);
    } catch (error) {
      if (error.code === 85 || error.message.includes('existing index')) {
        const indexName = Object.keys(index).map(key => `${key}_1`).join('_');
        console.warn(`[DB] Dropping conflicting index: ${indexName} on ${collection}`);
        try {
          await db.collection(collection).dropIndex(indexName);
          await db.collection(collection).createIndex(index, options);
        } catch (dropError) {
          console.warn(`[DB] Failed to recreate index: ${indexName}`, dropError.message);
        }
      } else {
        console.error(`[DB] Error ensuring index on ${collection}:`, error.message);
      }
    }
  };

  await ensureIndex('session', { tokenHash: 1 }, { unique: true, sparse: true });
  await ensureIndex('session', { token: 1 }, { unique: true, sparse: true });
  await ensureIndex('session', { userId: 1 }, {});
  await ensureIndex('session', { expiresAt: 1 }, { expireAfterSeconds: 0 });

  indexesEnsured = true;
};

const connectDB = async () => {
  // Prevent multiple connection attempts in serverless environments
  if (mongoose.connection.readyState === 1) {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[DB] MongoDB already connected, reusing existing connection');
    }
    return mongoose.connection;
  }

  // Return pending connection if already in progress
  if (isConnecting && connectionPromise) {
    return connectionPromise;
  }

  if (!process.env.MONGODB_URI) {
    const error = new Error('MONGODB_URI environment variable is not configured. Check your .env file.');
    console.error(`[DB] ${error.message}`);
    throw error;
  }

  isConnecting = true;

  connectionPromise = (async () => {
    try {
      registerConnectionListeners();

      const maxPoolSize = Number(process.env.MONGODB_MAX_POOL_SIZE || 5);
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[DB] Attempting connection to MongoDB (pool size: ${maxPoolSize})...`);
      }

      const conn = await mongoose.connect(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 15000,
        socketTimeoutMS: 45000,
        maxPoolSize,
        minPoolSize: 0,
        retryWrites: true,
        w: 'majority',
      });
      await ensureRuntimeIndexes();

      if (process.env.NODE_ENV !== 'production') {
        console.log(`[DB] ✓ MongoDB Connected successfully to ${conn.connection.host}:${conn.connection.port}`);
      }

      return conn;
    } catch (error) {
      console.error(`[DB] ✗ MongoDB Connection Failed: ${error.message}`);
      throw error;
    } finally {
      isConnecting = false;
    }
  })();

  return connectionPromise;
};

if (!process.env.VERCEL) {
  process.on('SIGINT', async () => {
    try {
      await mongoose.connection.close();
      if (process.env.NODE_ENV !== 'production') {
        console.log('[DB] MongoDB connection closed gracefully');
      }
      process.exit(0);
    } catch (error) {
      console.error(`[DB] Error during shutdown: ${error.message}`);
      process.exit(1);
    }
  });
}

module.exports = connectDB;
