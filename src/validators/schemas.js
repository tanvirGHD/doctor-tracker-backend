const { z } = require('zod');
const { CONDITIONS, GENDERS } = require('../utils/constants');

const text = (label, max = 100) =>
  z.string({ required_error: `${label} is required` }).trim().min(1, `${label} is required`).max(max);

const email = z.string({ required_error: 'Email is required' }).trim().toLowerCase().email('Enter a valid email');
const phone = z
  .string({ required_error: 'Phone is required' })
  .trim()
  .regex(/^[+\d][\d\s\-()]{5,19}$/, 'Enter a valid phone number');

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');

// ---- Auth
const registerSchema = z.object({
  name: text('Name', 80),
  email,
  password: z.string({ required_error: 'Password is required' }).min(8, 'Password must be at least 8 characters').max(72),
});

const loginSchema = z.object({
  email,
  password: z.string({ required_error: 'Password is required' }).min(1, 'Password is required'),
});

// ---- Doctors
const doctorSchema = z.object({
  name: text('Name'),
  specialization: text('Specialization'),
  hospital: text('Hospital', 150),
  phone,
  email,
});

// ---- Patients
const patientBase = z.object({
  name: text('Name'),
  age: z.coerce.number({ invalid_type_error: 'Age must be a number' }).int().min(0).max(130),
  gender: z.enum(GENDERS, { errorMap: () => ({ message: 'Select a gender' }) }),
  phone,
  condition: z.enum(CONDITIONS, { errorMap: () => ({ message: 'Select a condition' }) }),
  notes: z.string().trim().max(500).optional().default(''),
});

const patientCreateSchema = patientBase.extend({ doctor: objectId });
const patientNestedCreateSchema = patientBase; // doctor comes from the URL
const patientUpdateSchema = patientBase.extend({ doctor: objectId.optional() });

// ---- Query strings
const pagination = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
};

const doctorQuerySchema = z.object({
  ...pagination,
  search: z.string().trim().max(100).optional(),
  specialization: z.string().trim().max(100).optional(),
  hospital: z.string().trim().max(150).optional(),
  from: dateString.optional(),
  to: dateString.optional(),
  sort: z.enum(['newest', 'oldest', 'name']).default('newest'),
});

const patientQuerySchema = z.object({
  ...pagination,
  search: z.string().trim().max(100).optional(),
  condition: z.enum(CONDITIONS).optional(),
  doctor: objectId.optional(),
  from: dateString.optional(),
  to: dateString.optional(),
  sort: z.enum(['newest', 'oldest', 'name']).default('newest'),
});

const dashboardQuerySchema = z.object({
  days: z.coerce.number().int().min(7).max(365).default(30),
});

module.exports = {
  registerSchema,
  loginSchema,
  doctorSchema,
  patientCreateSchema,
  patientNestedCreateSchema,
  patientUpdateSchema,
  doctorQuerySchema,
  patientQuerySchema,
  dashboardQuerySchema,
};
