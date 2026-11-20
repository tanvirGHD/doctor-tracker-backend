const mongoose = require('mongoose');
const ApiError = require('../utils/ApiError');

// Rejects malformed ObjectIds early instead of letting Mongoose throw a CastError.
const validateId = (...params) => (req, res, next) => {
  for (const param of params) {
    if (!mongoose.isValidObjectId(req.params[param])) {
      return next(new ApiError(400, `Invalid ${param}`));
    }
  }
  next();
};

module.exports = validateId;
