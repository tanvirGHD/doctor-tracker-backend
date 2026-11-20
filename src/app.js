const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const { clientUrls, nodeEnv } = require('./config/env');
const { protect } = require('./middleware/auth');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

app.set('trust proxy', 1); // Render / Vercel sit behind a proxy

app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      // Allow same-origin tools (no Origin header) and the configured frontends.
      if (!origin || clientUrls.includes(origin)) return callback(null, true);
      return callback(new Error('Not allowed by CORS'));
    },
  })
);
app.use(compression());
app.use(express.json({ limit: '100kb' }));
if (nodeEnv !== 'test') app.use(morgan(nodeEnv === 'production' ? 'combined' : 'dev'));

app.get('/', (req, res) => res.json({ name: 'Doctor Tracker API', status: 'ok' }));
app.get('/api/health', (req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

app.use('/api/auth', require('./routes/auth.routes'));

// Everything below requires a valid JWT.
app.use('/api/dashboard', protect, require('./routes/dashboard.routes'));
app.use('/api/doctors', protect, require('./routes/doctor.routes'));
app.use('/api/patients', protect, require('./routes/patient.routes'));

app.use(notFound);
app.use(errorHandler);

module.exports = app;
