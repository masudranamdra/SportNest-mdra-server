const mongoose = require('mongoose');

const facilitySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please add a facility name'],
      trim: true,
    },
    facility_type: {
      type: String,
      required: [true, 'Please add a facility type (e.g., football, basketball, cricket)'],
      lowercase: true,
    },
    image: {
      type: String,
      required: [true, 'Please add an image URL'],
    },
    location: {
      type: String,
      required: [true, 'Please add a location'],
    },
    price_per_hour: {
      type: Number,
      required: [true, 'Please add price per hour'],
      min: [0, 'Price must be a positive number'],
    },
    capacity: {
      type: Number,
      required: [true, 'Please add capacity limit'],
      min: [1, 'Capacity must be at least 1'],
    },
    available_slots: {
      type: [String],
      required: [true, 'Please specify available time slots'],
    },
    description: {
      type: String,
      required: [true, 'Please add a description'],
    },
    owner_email: {
      type: String,
      required: [true, 'Please add owner email'],
    },
    booking_count: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

facilitySchema.index({ owner_email: 1, createdAt: -1 });
facilitySchema.index({ facility_type: 1, createdAt: -1 });
facilitySchema.index({ name: 'text', location: 'text', description: 'text' });

module.exports = mongoose.model('Facility', facilitySchema);
