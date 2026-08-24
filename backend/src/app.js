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

// CORS
app.use(
  cors({
    origin: true,
    credentials: true
  })
);

// JSON body parser
app.use(express.json());

// Root route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'TicketHub API is running!',
    health: '/api/health'
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'TicketHub API is running.'
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/seats', seatRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/waitlist', waitlistRoutes);
app.use('/api/venues', venueRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/tickets', ticketRoutes);

// 404 handler MUST be after all routes
app.use(notFoundHandler);

// Error handler MUST be last
app.use(errorHandler);

module.exports = app;
