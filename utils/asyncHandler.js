/**
 * Async error handler wrapper
 * Wraps async route handlers to catch errors and pass them to the error middleware
 * Usage: router.get('/path', asyncHandler(async (req, res, next) => { ... }))
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
