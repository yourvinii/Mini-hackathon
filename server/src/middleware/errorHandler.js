/**
 * Centralized Error Handling Middleware
 * Guarantees a consistent JSON error format across all routes
 */
const errorHandler = (err, req, res, next) => {
  console.error(`[Error] ${req.method} ${req.originalUrl}:`, err);

  const statusCode = err.statusCode || (res.statusCode === 200 ? 500 : res.statusCode) || 500;
  
  let message = err.message || 'Internal Server Error';
  let code = err.code || 'SERVER_ERROR';

  if (err.name === 'ValidationError') {
    code = 'VALIDATION_ERROR';
    message = Object.values(err.errors).map(e => e.message).join(', ');
  } else if (err.name === 'CastError') {
    code = 'INVALID_ID';
    message = `Invalid resource ID format for ${err.path}`;
  }

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      code,
      details: err.details || (process.env.NODE_ENV === 'development' ? err.stack : undefined)
    }
  });
};

module.exports = errorHandler;
