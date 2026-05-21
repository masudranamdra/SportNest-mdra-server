const Booking = require('../models/Booking');
const Facility = require('../models/Facility');
const mongoose = require('mongoose');

const isValidBookingDate = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false;

  const bookingDate = new Date(`${value}T00:00:00.000Z`);
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  return !Number.isNaN(bookingDate.getTime()) && bookingDate >= today;
};

// @desc    Get user bookings
// @route   GET /api/bookings
// @access  Private
const getBookings = async (req, res, next) => {
  try {
    // 1. Fetch bookings matching user_email, populating the facility details
    const bookings = await Booking.find({ user_email: req.user.email })
      .populate('facility_id', 'name image location price_per_hour facility_type')
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      count: bookings.length,
      bookings,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new booking slot
// @route   POST /api/bookings
// @access  Private
const createBooking = async (req, res, next) => {
  try {
    const { facility_id, booking_date, time_slot, hours } = req.body;

    if (!facility_id || !booking_date || !time_slot || !hours) {
      res.status(400);
      throw new Error('Please enter all required fields (facility_id, booking_date, time_slot, hours)');
    }

    if (!mongoose.Types.ObjectId.isValid(facility_id)) {
      res.status(400);
      throw new Error('Invalid facility id');
    }

    if (!isValidBookingDate(booking_date)) {
      res.status(400);
      throw new Error('Booking date must be today or a future date in YYYY-MM-DD format');
    }

    const normalizedHours = Number(hours);
    if (!Number.isInteger(normalizedHours) || normalizedHours < 1 || normalizedHours > 12) {
      res.status(400);
      throw new Error('Booking duration must be between 1 and 12 hours');
    }

    const facility = await Facility.findById(facility_id);
    if (!facility) {
      res.status(404);
      throw new Error(`Facility not found with ID of ${facility_id}`);
    }

    if (!facility.available_slots.includes(time_slot)) {
      res.status(400);
      throw new Error('Selected time slot is not available for this facility');
    }

    const bookingConflict = await Booking.findOne({
      facility_id,
      booking_date,
      time_slot,
      status: { $ne: 'cancelled' },
    });

    if (bookingConflict) {
      res.status(400);
      throw new Error('This time slot is already booked for this facility on the chosen date.');
    }

    const total_price = normalizedHours * facility.price_per_hour;

    const booking = await Booking.create({
      facility_id,
      user_email: req.user.email,
      booking_date,
      time_slot,
      hours: normalizedHours,
      total_price,
      status: 'pending',
    });

    await Facility.findByIdAndUpdate(facility_id, { $inc: { booking_count: 1 } });

    res.status(201).json({
      success: true,
      message: 'Facility slot booked successfully!',
      booking,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel/Delete booking
// @route   DELETE /api/bookings/:id
// @access  Private
const deleteBooking = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      res.status(400);
      throw new Error('Invalid booking id');
    }

    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      res.status(404);
      throw new Error(`Booking not found with ID of ${req.params.id}`);
    }

    if (booking.user_email !== req.user.email) {
      res.status(403);
      throw new Error('Not authorized to cancel this booking.');
    }

    await Facility.updateOne({ _id: booking.facility_id, booking_count: { $gt: 0 } }, { $inc: { booking_count: -1 } });

    await Booking.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Booking cancelled and removed successfully!',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getBookings,
  createBooking,
  deleteBooking,
};
