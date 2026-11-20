const mongoose = require('mongoose');

const doctorSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    specialization: { type: String, required: true, trim: true, maxlength: 100 },
    hospital: { type: String, required: true, trim: true, maxlength: 150 },
    phone: { type: String, required: true, trim: true, maxlength: 30 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 120 },
  },
  { timestamps: true }
);

// Every query is scoped by owner first, so every index starts with owner.
doctorSchema.index({ owner: 1, createdAt: -1 }); // default list + date filter + newest first
doctorSchema.index({ owner: 1, specialization: 1, createdAt: -1 }); // specialization filter
doctorSchema.index({ owner: 1, hospital: 1, createdAt: -1 }); // hospital filter
doctorSchema.index({ owner: 1, name: 1 }); // sort by name
doctorSchema.index({ owner: 1, email: 1 }, { unique: true }); // no duplicate doctors per admin

module.exports = mongoose.model('Doctor', doctorSchema);
