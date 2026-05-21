const windowMs = 15 * 60 * 1000;
const max = Number(process.env.RATE_LIMIT_MAX || 300);
const hits = new Map();
let lastSweepAt = Date.now();

const sweepExpiredHits = (now) => {
  if (now - lastSweepAt <= windowMs) return;

  for (const [ip, value] of hits.entries()) {
    if (value.resetAt <= now) hits.delete(ip);
  }

  lastSweepAt = now;
};

const apiLimiter = (req, res, next) => {
  const now = Date.now();
  const forwardedFor = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  const key = req.ip || forwardedFor || 'unknown';
  const record = hits.get(key) || { count: 0, resetAt: now + windowMs };

  sweepExpiredHits(now);

  if (record.resetAt <= now) {
    record.count = 0;
    record.resetAt = now + windowMs;
  }

  record.count += 1;
  hits.set(key, record);

  if (record.count > max) {
    return res.status(429).json({
      success: false,
      message: 'Too many requests. Please try again later.',
    });
  }

  next();
};

module.exports = apiLimiter;
