const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please add a name'],
    },
    email: {
      type: String,
      required: [true, 'Please add an email'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        'Please add a valid email',
      ],
    },
    photoURL: {
      type: String,
      default: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200',
    },
    image: {
      type: String,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    password: {
      type: String,
      required: false,
    },
    googleId: {
      type: String,
      default: null,
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
  },
  {
    timestamps: true,
    collection: 'user',
  }
);

// Synchronize photoURL and image fields for backward compatibility
userSchema.pre('save', function (next) {
  if (this.image && !this.photoURL) {
    this.photoURL = this.image;
  } else if (this.photoURL && !this.image) {
    this.image = this.photoURL;
  }
  next();
});

// Instance method to check if user is admin
userSchema.methods.isAdmin = function () {
  const adminEmails = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  return this.role === 'admin' || adminEmails.includes(this.email);
};

module.exports = mongoose.model('User', userSchema);
