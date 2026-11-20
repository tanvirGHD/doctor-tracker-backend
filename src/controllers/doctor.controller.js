const Doctor = require('../models/Doctor');
const Patient = require('../models/Patient');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { escapeRegex, buildDateRange, buildPagination } = require('../utils/helpers');
const { listPatients } = require('./patient.controller');

const SORTS = {
  newest: { createdAt: -1, _id: -1 },
  oldest: { createdAt: 1, _id: 1 },
  name: { name: 1, _id: 1 },
};

// Loads a doctor that belongs to the logged-in admin or throws 404.
async function findOwnedDoctor(id, owner) {
  const doctor = await Doctor.findOne({ _id: id, owner });
  if (!doctor) throw new ApiError(404, 'Doctor not found');
  return doctor;
}

exports.findOwnedDoctor = findOwnedDoctor;

exports.list = asyncHandler(async (req, res) => {
  const { page, limit, search, specialization, hospital, from, to, sort } = req.query;

  const filter = { owner: req.user._id };
  if (specialization) filter.specialization = specialization;
  if (hospital) filter.hospital = hospital;
  const range = buildDateRange(from, to);
  if (range) filter.createdAt = range;
  if (search) {
    const rx = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ name: rx }, { specialization: rx }, { hospital: rx }, { email: rx }];
  }

  const [doctors, total] = await Promise.all([
    Doctor.find(filter)
      .sort(SORTS[sort])
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Doctor.countDocuments(filter),
  ]);

  // One grouped query for patient counts of the doctors on this page (no N+1).
  const counts = await Patient.aggregate([
    { $match: { owner: req.user._id, doctor: { $in: doctors.map((d) => d._id) } } },
    { $group: { _id: '$doctor', count: { $sum: 1 } } },
  ]);
  const countMap = new Map(counts.map((c) => [String(c._id), c.count]));

  res.json({
    data: doctors.map((d) => ({ ...d, patientCount: countMap.get(String(d._id)) || 0 })),
    pagination: buildPagination(total, page, limit),
  });
});

// Distinct values used to fill the filter dropdowns.
exports.filters = asyncHandler(async (req, res) => {
  const [specializations, hospitals] = await Promise.all([
    Doctor.distinct('specialization', { owner: req.user._id }),
    Doctor.distinct('hospital', { owner: req.user._id }),
  ]);
  res.json({ specializations: specializations.sort(), hospitals: hospitals.sort() });
});

exports.getOne = asyncHandler(async (req, res) => {
  const doctor = await findOwnedDoctor(req.params.id, req.user._id);
  const patientCount = await Patient.countDocuments({ owner: req.user._id, doctor: doctor._id });
  res.json({ data: { ...doctor.toObject(), patientCount } });
});

exports.create = asyncHandler(async (req, res) => {
  const doctor = await Doctor.create({ ...req.body, owner: req.user._id });
  res.status(201).json({ data: doctor });
});

exports.update = asyncHandler(async (req, res) => {
  const doctor = await findOwnedDoctor(req.params.id, req.user._id);
  Object.assign(doctor, req.body);
  await doctor.save();
  res.json({ data: doctor });
});

exports.remove = asyncHandler(async (req, res) => {
  const doctor = await findOwnedDoctor(req.params.id, req.user._id);
  // A patient always belongs to a doctor, so remove them together.
  await Promise.all([
    Patient.deleteMany({ owner: req.user._id, doctor: doctor._id }),
    doctor.deleteOne(),
  ]);
  res.json({ message: 'Doctor and their patients were deleted' });
});

// ---- Patients under a specific doctor
exports.listPatients = asyncHandler(async (req, res, next) => {
  const doctor = await findOwnedDoctor(req.params.id, req.user._id);
  req.query.doctor = String(doctor._id);
  return listPatients(req, res, next);
});

exports.addPatient = asyncHandler(async (req, res) => {
  const doctor = await findOwnedDoctor(req.params.id, req.user._id);
  const patient = await Patient.create({ ...req.body, doctor: doctor._id, owner: req.user._id });
  res.status(201).json({ data: patient });
});

exports.removePatient = asyncHandler(async (req, res) => {
  const result = await Patient.deleteOne({
    _id: req.params.patientId,
    doctor: req.params.id,
    owner: req.user._id,
  });
  if (!result.deletedCount) throw new ApiError(404, 'Patient not found for this doctor');
  res.json({ message: 'Patient removed' });
});
