const mongoose = require('mongoose');
const { CONDITIONS, GENDERS } = require('../utils/constants');

const patientSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    age: { type: Number, required: true, min: 0, max: 130 },
    gender: { type: String, enum: GENDERS, required: true },
    phone: { type: String, required: true, trim: true, maxlength: 30 },
    condition: { type: String, enum: CONDITIONS, required: true },
    notes: { type: String, trim: true, maxlength: 500, default: '' },
  },
  { timestamps: true }
);

patientSchema.index({ owner: 1, createdAt: -1 }); // default list + date filter
patientSchema.index({ owner: 1, doctor: 1, createdAt: -1 }); // patients of a doctor
patientSchema.index({ owner: 1, condition: 1, createdAt: -1 }); // condition filter + condition chart
patientSchema.index({ owner: 1, name: 1 }); // sort by name

module.exports = mongoose.model('Patient', patientSchema);
