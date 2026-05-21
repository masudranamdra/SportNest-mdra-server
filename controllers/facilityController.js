const Facility = require('../models/Facility');
const mongoose = require('mongoose');

const escapeRegex = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const sanitizeString = (value, max = 500) =>
  typeof value === 'string' ? value.trim().slice(0, max) : '';

const normalizeSlots = (slots) => {
  const list = Array.isArray(slots) ? slots : [slots];
  return [...new Set(list.map((slot) => sanitizeString(slot, 40)).filter(Boolean))];
};

// @desc    Get all facilities with search and filter
// @route   GET /api/facilities
// @access  Public
const getFacilities = async (req, res, next) => {
  try {
    const { search, sport_type } = req.query;
    let query = {};

    if (search) {
      query.name = { $regex: escapeRegex(sanitizeString(search, 80)), $options: 'i' };
    }

    if (sport_type) {
      const sports = sport_type
        .split(',')
        .map((s) => sanitizeString(s, 30).toLowerCase())
        .filter(Boolean);
      query.facility_type = { $in: sports };
    }

    const facilities = await Facility.find(query).sort({ createdAt: -1 }).limit(100).lean();

    res.status(200).json({
      success: true,
      count: facilities.length,
      facilities,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single facility details
// @route   GET /api/facilities/:id
// @access  Public
const getFacilityById = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      res.status(400);
      throw new Error('Invalid facility id');
    }

    const facility = await Facility.findById(req.params.id);

    if (!facility) {
      res.status(404);
      throw new Error(`Facility not found with ID of ${req.params.id}`);
    }

    res.status(200).json({
      success: true,
      facility,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new facility
// @route   POST /api/facilities
// @access  Private (Owner only)
const createFacility = async (req, res, next) => {
  try {
    const { name, facility_type, image, location, price_per_hour, capacity, available_slots, description } = req.body;
    const normalizedSlots = normalizeSlots(available_slots);

    if (!name || !facility_type || !image || !location || !price_per_hour || !capacity || normalizedSlots.length === 0 || !description) {
      res.status(400);
      throw new Error('Please enter all required fields');
    }

    if (Number(price_per_hour) <= 0 || Number(capacity) <= 0) {
      res.status(400);
      throw new Error('Price and capacity must be positive values greater than zero');
    }

    const facility = await Facility.create({
      name: sanitizeString(name, 120),
      facility_type: sanitizeString(facility_type, 30).toLowerCase(),
      image: sanitizeString(image, 500),
      location: sanitizeString(location, 160),
      price_per_hour: Number(price_per_hour),
      capacity: Number(capacity),
      available_slots: normalizedSlots,
      description: sanitizeString(description, 1200),
      owner_email: req.user.email,
    });

    res.status(201).json({
      success: true,
      message: 'Sports facility listed successfully!',
      facility,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update an existing facility
// @route   PATCH /api/facilities/:id
// @access  Private (Owner only)
const updateFacility = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      res.status(400);
      throw new Error('Invalid facility id');
    }

    let facility = await Facility.findById(req.params.id);

    if (!facility) {
      res.status(404);
      throw new Error(`Facility not found with ID of ${req.params.id}`);
    }

    if (facility.owner_email !== req.user.email) {
      res.status(403);
      throw new Error('Not authorized to update this facility. Only the owner can modify list details.');
    }

    if (req.body.price_per_hour !== undefined && Number(req.body.price_per_hour) <= 0) {
      res.status(400);
      throw new Error('Price must be a positive value greater than zero');
    }
    if (req.body.capacity !== undefined && Number(req.body.capacity) <= 0) {
      res.status(400);
      throw new Error('Capacity must be at least 1');
    }

    const allowedFields = ['name', 'facility_type', 'image', 'location', 'price_per_hour', 'capacity', 'available_slots', 'description'];
    const updates = {};

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    ['name', 'facility_type', 'image', 'location', 'description'].forEach((field) => {
      if (updates[field] !== undefined) updates[field] = sanitizeString(updates[field], field === 'description' ? 1200 : 500);
    });

    if (req.body.facility_type) {
      updates.facility_type = sanitizeString(req.body.facility_type, 30).toLowerCase();
    }
    if (updates.price_per_hour !== undefined) updates.price_per_hour = Number(updates.price_per_hour);
    if (updates.capacity !== undefined) updates.capacity = Number(updates.capacity);
    if (updates.available_slots !== undefined) updates.available_slots = normalizeSlots(updates.available_slots);

    facility = await Facility.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      message: 'Facility details updated successfully!',
      facility,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a facility
// @route   DELETE /api/facilities/:id
// @access  Private (Owner only)
const deleteFacility = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      res.status(400);
      throw new Error('Invalid facility id');
    }

    const facility = await Facility.findById(req.params.id);

    if (!facility) {
      res.status(404);
      throw new Error(`Facility not found with ID of ${req.params.id}`);
    }

    if (facility.owner_email !== req.user.email) {
      res.status(403);
      throw new Error('Not authorized to delete this facility. Only the owner can delete listings.');
    }

    await Facility.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Facility listing removed successfully!',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getFacilities,
  getFacilityById,
  createFacility,
  updateFacility,
  deleteFacility,
};
