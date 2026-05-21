const express = require('express');
const router = express.Router();
const {
  getFacilities,
  getFacilityById,
  createFacility,
  updateFacility,
  deleteFacility,
} = require('../controllers/facilityController');
const { protect } = require('../middleware/authMiddleware');

// Public routes
router.get('/', getFacilities);
router.get('/:id', getFacilityById);

// Protected routes (Owner / Logged-in user)
router.post('/', protect, createFacility);
router.patch('/:id', protect, updateFacility);
router.delete('/:id', protect, deleteFacility);

module.exports = router;
