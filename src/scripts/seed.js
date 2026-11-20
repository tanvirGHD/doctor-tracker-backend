// Creates a demo admin with sample doctors and patients.
// Usage: npm run seed   (this clears the demo admin's old data first)
const mongoose = require('mongoose');
require('../config/env');
const connectDB = require('../config/db');
const User = require('../models/User');
const Doctor = require('../models/Doctor');
const Patient = require('../models/Patient');
const { CONDITIONS } = require('../utils/constants');

const DEMO = { name: 'Demo Admin', email: 'demo@doctortracker.com', password: 'Demo@12345' };

const DOCTORS = [
  ['Dr. Amina Rahman', 'Cardiology', 'Square Hospital'],
  ['Dr. Tanvir Hasan', 'Neurology', 'United Hospital'],
  ['Dr. Nusrat Jahan', 'Pediatrics', 'Evercare Hospital'],
  ['Dr. Imran Chowdhury', 'Orthopedics', 'Labaid Hospital'],
  ['Dr. Farzana Akter', 'Dermatology', 'Popular Medical Centre'],
  ['Dr. Sabbir Ahmed', 'Endocrinology', 'Square Hospital'],
  ['Dr. Maliha Karim', 'Pulmonology', 'United Hospital'],
  ['Dr. Rafiq Islam', 'General Medicine', 'Evercare Hospital'],
  ['Dr. Sharmin Sultana', 'Gynecology', 'Labaid Hospital'],
  ['Dr. Arif Mahmud', 'Cardiology', 'Popular Medical Centre'],
  ['Dr. Lamia Haque', 'Neurology', 'Square Hospital'],
  ['Dr. Kamal Uddin', 'Orthopedics', 'United Hospital'],
];

const FIRST = ['Rahim', 'Karim', 'Sadia', 'Nabila', 'Hasib', 'Mitu', 'Jahid', 'Rumana', 'Shakib', 'Tania', 'Faisal', 'Ayesha', 'Zubair', 'Lipi', 'Mahin', 'Sumaiya', 'Rakib', 'Nishat', 'Tareq', 'Orin'];
const LAST = ['Khan', 'Hossain', 'Begum', 'Sarker', 'Mia', 'Das', 'Roy', 'Ali', 'Uddin', 'Parvin', 'Talukder', 'Sheikh'];
const GENDER_BY_FIRST = { Sadia: 'Female', Nabila: 'Female', Mitu: 'Female', Rumana: 'Female', Tania: 'Female', Ayesha: 'Female', Lipi: 'Female', Sumaiya: 'Female', Nishat: 'Female', Orin: 'Female' };

// Deterministic pseudo-random so the demo data looks the same on every run.
let seed = 42;
const rand = () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000 - Math.floor(rand() * 20) * 60 * 60 * 1000);

async function run() {
  await connectDB();

  let user = await User.findOne({ email: DEMO.email });
  if (!user) user = await User.create(DEMO);
  await Promise.all([Doctor.deleteMany({ owner: user._id }), Patient.deleteMany({ owner: user._id })]);

  const doctors = await Doctor.insertMany(
    DOCTORS.map(([name, specialization, hospital], i) => ({
      owner: user._id,
      name,
      specialization,
      hospital,
      phone: `+8801${700000000 + i * 13579}`,
      email: `${name.toLowerCase().replace(/^dr\. /, '').replace(/\s+/g, '.')}@doctortracker.com`,
      createdAt: daysAgo(40 + Math.floor(rand() * 50)),
    }))
  );

  const patients = [];
  for (let i = 0; i < 90; i += 1) {
    const first = pick(FIRST);
    // Weight toward the first few doctors so the "patients per doctor" chart is interesting.
    const doctor = doctors[Math.floor(Math.pow(rand(), 1.6) * doctors.length)];
    patients.push({
      owner: user._id,
      doctor: doctor._id,
      name: `${first} ${pick(LAST)}`,
      age: 5 + Math.floor(rand() * 80),
      gender: GENDER_BY_FIRST[first] || 'Male',
      phone: `+8801${800000000 + i * 24681}`,
      condition: pick(CONDITIONS),
      notes: '',
      createdAt: daysAgo(Math.floor(rand() * 60)),
    });
  }
  await Patient.insertMany(patients);

  console.log(`Seeded ${doctors.length} doctors and ${patients.length} patients.`);
  console.log(`Demo login -> ${DEMO.email} / ${DEMO.password}`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
