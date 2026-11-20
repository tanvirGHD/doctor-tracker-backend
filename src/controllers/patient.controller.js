const Doctor = require('../models/Doctor');
const Patient = require('../models/Patient');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { escapeRegex, buildDateRange, buildPagination } = require('../utils/helpers');

const SORTS = {
  newest: { createdAt: -1, _id: -1 },
  oldest: { createdAt: 1, _id: 1 },
  name: { name: 1, _id: 1 },
};

async function assertOwnsDoctor(doctorId, owner) {
  const exists = await Doctor.exists({ _id: doctorId, owner });
  if (!exists) throw new ApiError(404, 'Doctor not found');
}

const listPatients = asyncHandler(async (req, res) => {
  const { page, limit, search, condition, doctor, from, to, sort } = req.query;

  const filter = { owner: req.user._id };
  if (condition) filter.condition = condition;
  if (doctor) filter.doctor = doctor;
  const range = buildDateRange(from, to);
  if (range) filter.createdAt = range;
  if (search) {
    const rx = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ name: rx }, { phone: rx }];
  }

  const [patients, total] = await Promise.all([
    Patient.find(filter)
      .sort(SORTS[sort])
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('doctor', 'name specialization') // only the fields the UI needs
      .lean(),
    Patient.countDocuments(filter),
  ]);

  res.json({ data: patients, pagination: buildPagination(total, page, limit) });
});

const getOne = asyncHandler(async (req, res) => {
  const patient = await Patient.findOne({ _id: req.params.id, owner: req.user._id }).populate(
    'doctor',
    'name specialization'
  );
  if (!patient) throw new ApiError(404, 'Patient not found');
  res.json({ data: patient });
});

const create = asyncHandler(async (req, res) => {
  await assertOwnsDoctor(req.body.doctor, req.user._id);
  const patient = await Patient.create({ ...req.body, owner: req.user._id });
  res.status(201).json({ data: patient });
});

const update = asyncHandler(async (req, res) => {
  const patient = await Patient.findOne({ _id: req.params.id, owner: req.user._id });
  if (!patient) throw new ApiError(404, 'Patient not found');

  if (req.body.doctor && String(req.body.doctor) !== String(patient.doctor)) {
    await assertOwnsDoctor(req.body.doctor, req.user._id);
  }
  Object.assign(patient, req.body);
  await patient.save();
  res.json({ data: patient });
});

const remove = asyncHandler(async (req, res) => {
  const result = await Patient.deleteOne({ _id: req.params.id, owner: req.user._id });
  if (!result.deletedCount) throw new ApiError(404, 'Patient not found');
  res.json({ message: 'Patient deleted' });
});

module.exports = { listPatients, getOne, create, update, remove };
