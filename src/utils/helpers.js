const mongoose = require('mongoose');

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Builds a { $gte, $lte } filter from "from" / "to" query values (YYYY-MM-DD).
function buildDateRange(from, to) {
  if (!from && !to) return undefined;
  const range = {};
  if (from) range.$gte = new Date(`${from}T00:00:00.000Z`);
  if (to) range.$lte = new Date(`${to}T23:59:59.999Z`);
  return range;
}

function buildPagination(total, page, limit) {
  return {
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

const toObjectId = (id) => new mongoose.Types.ObjectId(id);

module.exports = { escapeRegex, buildDateRange, buildPagination, toObjectId };
