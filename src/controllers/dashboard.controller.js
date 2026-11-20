const Doctor = require('../models/Doctor');
const Patient = require('../models/Patient');
const asyncHandler = require('../utils/asyncHandler');

const startOfDayUTC = (date) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

// Fills days that have no records with 0 so the chart line is continuous.
function fillDays(rows, days) {
  const map = new Map(rows.map((r) => [r._id, r.count]));
  const today = startOfDayUTC(new Date());
  const result = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setUTCDate(today.getUTCDate() - i);
    const key = d.toISOString().slice(0, 10);
    result.push({ date: key, count: map.get(key) || 0 });
  }
  return result;
}

exports.getStats = asyncHandler(async (req, res) => {
  const owner = req.user._id;
  const { days } = req.query;

  const since = startOfDayUTC(new Date());
  since.setUTCDate(since.getUTCDate() - (days - 1));

  const byDay = (Model) =>
    Model.aggregate([
      { $match: { owner, createdAt: { $gte: since } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
    ]);

  // All independent queries run in parallel; each one is served by an owner-prefixed index.
  const [
    totalDoctors,
    totalPatients,
    newDoctors,
    newPatients,
    patientsPerDoctorRaw,
    conditions,
    specializations,
    patientsByDay,
    doctorsByDay,
    recentPatients,
  ] = await Promise.all([
    Doctor.countDocuments({ owner }),
    Patient.countDocuments({ owner }),
    Doctor.countDocuments({ owner, createdAt: { $gte: since } }),
    Patient.countDocuments({ owner, createdAt: { $gte: since } }),
    Patient.aggregate([
      { $match: { owner } },
      { $group: { _id: '$doctor', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 8 },
    ]),
    Patient.aggregate([
      { $match: { owner } },
      { $group: { _id: '$condition', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    Doctor.aggregate([
      { $match: { owner } },
      { $group: { _id: '$specialization', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 8 },
    ]),
    byDay(Patient),
    byDay(Doctor),
    Patient.find({ owner }).sort({ createdAt: -1 }).limit(5).populate('doctor', 'name').lean(),
  ]);

  // Resolve doctor names for the top doctors with a single extra query.
  const topDoctors = await Doctor.find({ _id: { $in: patientsPerDoctorRaw.map((r) => r._id) } })
    .select('name')
    .lean();
  const nameMap = new Map(topDoctors.map((d) => [String(d._id), d.name]));

  const patientSeries = fillDays(patientsByDay, days);
  const doctorSeries = fillDays(doctorsByDay, days);

  res.json({
    rangeDays: days,
    totals: {
      doctors: totalDoctors,
      patients: totalPatients,
      avgPatientsPerDoctor: totalDoctors ? Number((totalPatients / totalDoctors).toFixed(1)) : 0,
      newDoctors,
      newPatients,
    },
    patientsPerDoctor: patientsPerDoctorRaw.map((r) => ({
      doctorId: r._id,
      name: nameMap.get(String(r._id)) || 'Unknown',
      count: r.count,
    })),
    conditions: conditions.map((r) => ({ name: r._id, count: r.count })),
    specializations: specializations.map((r) => ({ name: r._id, count: r.count })),
    timeline: patientSeries.map((row, i) => ({
      date: row.date,
      patients: row.count,
      doctors: doctorSeries[i].count,
    })),
    recentPatients,
  });
});
