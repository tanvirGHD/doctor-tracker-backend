# Doctor Tracker - Backend

REST API for Doctor Tracker, built with Node.js, Express and MongoDB (Mongoose). Frontend repository: `doctor-tracker-frontend`.

- Live API: `<add your Render URL>` (health check: `/api/health`)
- Demo login: `demo@doctortracker.com` / `Demo@12345`

## Description

The Doctor Tracker API powers a secure admin portal for managing doctors and their patients. It handles registration and login with JWT, full CRUD for doctors and patients, search, filtering and pagination, and a dashboard endpoint that aggregates totals, patients per doctor and activity over time. Every record belongs to the admin who created it, and no admin can read or change another admin's data.

## Setup Guide

Requirements: Node.js 18+ and a MongoDB database (MongoDB Atlas free tier works).

```bash
git clone <this-repo-url> doctor-tracker-backend
cd doctor-tracker-backend
npm install
cp .env.example .env
```

Edit `.env` (see `.env.example`):

| Variable | Description |
|---|---|
| `PORT` | Port to listen on (default 5000) |
| `MONGODB_URI` | MongoDB connection string, including a database name such as `/doctor-tracker` |
| `JWT_SECRET` | Long random string used to sign tokens |
| `JWT_EXPIRES_IN` | Token lifetime, for example `7d` |
| `CLIENT_URL` | Allowed frontend origin(s) for CORS, comma separated |

Generate a secret with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`.

Run it:

```bash
npm run seed    # optional: demo admin + 12 doctors + 90 patients
npm run dev     # http://localhost:5000
npm start       # production
```

MongoDB Atlas: create a database user, then under Network Access allow your IP (or `0.0.0.0/0` for a hosted server such as Render). Never commit `.env`.

Deploy to Render: create a Web Service from this repo, build command `npm install`, start command `npm start`, and add the four environment variables above. Set `CLIENT_URL` to your Vercel URL. Free instances sleep when idle, so the first request after a pause can take about 30 seconds.

### API overview

All routes except `/api/auth/*` and `/api/health` require `Authorization: Bearer <token>`.

| Method | Route | Purpose |
|---|---|---|
| POST | `/api/auth/register`, `/api/auth/login` | Create account, sign in |
| GET | `/api/auth/me` | Current user |
| GET | `/api/dashboard?days=30` | Totals, charts data, recent patients |
| GET, POST | `/api/doctors` | List (search, filters, pagination) and create |
| GET | `/api/doctors/filters` | Distinct specializations and hospitals |
| GET, PUT, DELETE | `/api/doctors/:id` | Read, update, delete (also deletes the doctor's patients) |
| GET, POST | `/api/doctors/:id/patients` | A doctor's patients, add a patient under a doctor |
| DELETE | `/api/doctors/:id/patients/:patientId` | Remove a patient from a doctor |
| GET, POST | `/api/patients` | List (search, filters, pagination) and create |
| GET, PUT, DELETE | `/api/patients/:id` | Read, update, delete |

List query parameters: `page`, `limit` (max 50), `search`, `from`, `to` (YYYY-MM-DD), `sort` (`newest`, `oldest`, `name`), plus `specialization` and `hospital` for doctors, `condition` and `doctor` for patients.

## System Architecture

```
Request -> helmet / cors / compression / json parser
        -> route -> protect (JWT) -> validate (zod) -> controller -> Mongoose -> MongoDB
        -> errorHandler (consistent { message, details } JSON)
```

```
src/
  config/        env loading and database connection
  models/        User, Doctor, Patient schemas and indexes
  middleware/    auth, validation, id check, error handling
  validators/    zod schemas for bodies and query strings
  controllers/   request logic
  routes/        URL to controller wiring
  scripts/       seed.js
```

The frontend (Next.js) is a separate app that talks to this API only over REST. Authentication is stateless: the server signs a JWT at login and verifies it on every protected request.

## Technical Decisions

### 1. Owner-scoped documents with owner-prefixed compound indexes

Each doctor and patient stores an `owner` id, and every controller query includes it. Authorization therefore happens in the data layer, not just in the UI, and every query only touches one admin's documents. Indexes begin with `owner` followed by the filter or sort field, for example `{ owner, specialization, createdAt: -1 }` and `{ owner, doctor, createdAt: -1 }`, so filtering plus newest-first ordering is served by a single index without an in-memory sort. A unique `{ owner, email }` index stops duplicate doctors, and duplicate-key errors are turned into a readable `409` response.

### 2. Validate at the edge, aggregate in the database

Request bodies and query strings are parsed with zod before reaching a controller. This coerces numbers, trims text, rejects unknown sort or condition values and caps `limit` at 50, so controllers only handle clean input and cannot be used to request unbounded pages. For the dashboard, counting and grouping happen in MongoDB (`$group`, `$dateToString`) instead of loading documents into Node, all independent queries run in parallel with `Promise.all`, and missing days are filled with zeros in code so charts have a continuous axis. Doctor list rows get their patient counts from a single grouped query rather than one query per doctor.

## Visual Evidence

This repository has no UI. Screenshots of the application (desktop and mobile) are in the frontend repository README.
