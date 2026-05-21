const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    facility_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Facility',
      required: [true, 'Facility ID is required'],
    },
    user_email: {
      type: String,
      required: [true, 'User email is required'],
    },
    booking_date: {
      type: String,
      required: [true, 'Booking date is required (format: YYYY-MM-DD)'],
    },
    time_slot: {
      type: String,
      required: [true, 'Time slot is required'],
    },
    hours: {
      type: Number,
      required: [true, 'Number of hours is required'],
      min: [1, 'Hours must be at least 1'],
    },
    total_price: {
      type: Number,
      required: [true, 'Total price is required'],
      min: [0, 'Total price cannot be negative'],
    },
    status: {
      type: String,
      default: 'pending',
      enum: ['pending', 'confirmed', 'cancelled'],
    },
  },
  {
    timestamps: true,
  }
);

bookingSchema.index({ user_email: 1, createdAt: -1 });
bookingSchema.index(
  { facility_id: 1, booking_date: 1, time_slot: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ['pending', 'confirmed'] } },
  }
);

module.exports = mongoose.model('Booking', bookingSchema);
