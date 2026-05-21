const express = require('express');
const mongoose = require('mongoose');
const authRoutes = require('./authRoutes');
const facilityRoutes = require('./facilityRoutes');
const bookingRoutes = require('./bookingRoutes');
const { ensureDBReady } = require('../middleware/dbMiddleware');

const router = express.Router();

router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    service: 'sportnest-api',
    status: 'ok',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  });
});

router.use('/auth', ensureDBReady, authRoutes);
router.use('/facilities', ensureDBReady, facilityRoutes);
router.use('/bookings', ensureDBReady, bookingRoutes);

module.exports = router;
