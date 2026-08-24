const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const authRoutes = require('./routes/authRoutes');
const eventRoutes = require('./routes/eventRoutes');
const seatRoutes = require('./routes/seatRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const waitlistRoutes = require('./routes/waitlistRoutes');
const venueRoutes = require('./routes/venueRoutes');
const adminRoutes = require('./routes/adminRoutes');
const ticketRoutes = require('./routes/ticketRoutes');

const app = express();

// ===============================
// CORS CONFIGURATION
// ===============================

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://tickethub-oqvysnafg-bahartahiliani2005-4077s-projects.vercel.app',
  'https://tickethub-ivory.vercel.app'
];

const corsOptions = {
  origin: function (origin, callback) {

    // Allow requests without an origin
    // (Postman, Railway health checks, etc.)
    if (!origin) {
      return callback(null, true);
    }

    // Allow known origins
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Allow all Vercel preview deployments
    if (origin.endsWith('.vercel.app')) {
      return callback(null, true);
    }

    // Allow localhost during development
    if (
      origin.startsWith('http://localhost:') ||
      origin.startsWith('http://127.0.0.1:')
    ) {
      return callback(null, true);
    }

    return callback(new Error('Not allowed by CORS'));
  },

  credentials: true,

  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],

  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization'
  ]
};

app.use(cors(corsOptions));

// ===============================
// BODY PARSER
// ===============================

app.use(express.json());

// ===============================
// ROOT ROUTE
// ===============================

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'TicketHub API is running!',
    health: '/api/health'
  });
});

// ===============================
// HEALTH CHECK
// ===============================

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'TicketHub API is running.'
  });
});

// ===============================
// API ROUTES
// ===============================

app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/seats', seatRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/waitlist', waitlistRoutes);
app.use('/api/venues', venueRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/tickets', ticketRoutes);

// ===============================
// ERROR HANDLING
// ===============================

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
