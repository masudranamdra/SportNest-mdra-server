const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || (res.statusCode === 200 ? 500 : res.statusCode);
  let message = err.message;
  let errors = {};

  // 1. Mongoose Bad ObjectId (CastError)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Resource not found with id of ${err.value}`;
  }

  // 2. Mongoose Duplicate Key Error
  if (err.code === 11000) {
    statusCode = 400;
    const key = Object.keys(err.keyValue)[0];
    message = key === 'email'
      ? 'Email already exists or invalid details'
      : `Duplicate value for unique field '${key}'`;
  }

  // 3. Mongoose Validation Error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
    Object.values(err.errors).forEach((val) => {
      errors[val.path] = val.message;
    });
  }

  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Not authorized, invalid token';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Not authorized, token expired';
  }

  if (process.env.NODE_ENV !== 'production' || statusCode >= 500) {
    console.error(`[ERROR] ${statusCode} ${message}`);
  }

  const payload = {
    success: false,
    message,
  };

  // Only include stack trace in development
  if (process.env.NODE_ENV !== 'production' && err.stack) {
    payload.stack = err.stack;
  }

  if (Object.keys(errors).length > 0) {
    payload.errors = errors;
  }

  return res.status(statusCode).json(payload);
};

module.exports = { errorHandler };
