const { validationResult } = require('express-validator');

/**
 * Middleware that checks for express-validator results
 * Returns a uniform error response if validation fails
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Request validation failed',
        code: 'VALIDATION_ERROR',
        details: errors.array().map(e => ({
          field: e.path || e.param,
          message: e.msg,
          value: e.value
        }))
      }
    });
  }
  next();
};

module.exports = validate;
