const logger = require('../utils/logger');

function errorHandler(err, req, res, next) {
  logger.error('Unhandled error:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });

  if (err.name === 'ValidationError') {
    return res.status(400).json({ success: false, message: err.message });
  }

  if (err.code === '23505') { // Postgres unique violation
    return res.status(409).json({ success: false, message: 'Duplicate entry - record already exists' });
  }

  if (err.code === '23503') { // Postgres FK violation
    return res.status(400).json({ success: false, message: 'Referenced record does not exist' });
  }

  return res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    timestamp: new Date().toISOString()
  });
}

module.exports = { errorHandler };
