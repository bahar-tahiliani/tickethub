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

// ===============================
// CORS CONFIGURATION
// ===============================

const corsOptions = {
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'Accept'
  ]
};

app.use(cors(corsOptions));

// Handle preflight requests
app.options('*', cors(corsOptions));
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
