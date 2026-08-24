app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'TicketHub API is running!',
    health: '/api/health'
  });
});

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

// MUST be last
app.use(notFoundHandler);
app.use(errorHandler);
