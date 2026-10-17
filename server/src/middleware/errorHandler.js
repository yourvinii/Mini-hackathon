export const errorHandler = (err, req, res, next) => {
  console.error('[Unhandled Error]:', err);

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(val => val.message);
    return res.status(400).json({
      error: 'Validation failed',
      details: messages,
    });
  }

  // Mongoose CastError (e.g. invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({
      error: `Resource not found with id of ${err.value}`,
    });
  }

  // Duplicate key error (e.g. unique email)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return res.status(409).json({
      error: `Duplicate value entered for ${field}`,
    });
  }

  // JSON syntax error
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      error: 'Malformed JSON payload',
    });
  }

  const statusCode = err.statusCode || res.statusCode !== 200 ? res.statusCode : 500;
  return res.status(statusCode >= 400 ? statusCode : 500).json({
    error: err.message || 'Internal Server Error',
  });
};

export const notFoundHandler = (req, res) => {
  res.status(404).json({
    error: `Endpoint not found: ${req.method} ${req.originalUrl}`,
  });
};
