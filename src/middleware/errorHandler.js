const { nodeEnv } = require('../config/env');

const notFound = (req, res) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
};

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let status = err.statusCode || 500;
  let message = err.message || 'Something went wrong';
  let details = err.details;

  if (err.code === 11000) {
    status = 409;
    const field = Object.keys(err.keyPattern || {}).find((key) => key !== 'owner') || 'value';
    message = `A record with this ${field} already exists`;
  } else if (err.name === 'ValidationError') {
    status = 400;
    message = 'Validation failed';
    details = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
  } else if (err.name === 'CastError') {
    status = 400;
    message = `Invalid ${err.path}`;
  } else if (err.type === 'entity.parse.failed') {
    status = 400;
    message = 'Malformed JSON body';
  }

  if (status >= 500) console.error(err);

  res.status(status).json({
    message: status >= 500 && nodeEnv === 'production' ? 'Internal server error' : message,
    ...(details ? { details } : {}),
  });
};

module.exports = { notFound, errorHandler };
