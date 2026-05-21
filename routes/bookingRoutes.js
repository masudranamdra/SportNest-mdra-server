const express = require('express');
const router = express.Router();
const { getBookings, createBooking, deleteBooking } = require('../controllers/bookingController');
const { protect } = require('../middleware/authMiddleware');

// All booking routes require authentication
router.use(protect);

router.get('/', getBookings);
router.post('/', createBooking);
router.delete('/:id', deleteBooking);

module.exports = router;
