const asyncHandler = require('../utils/asyncHandler');
const bookingModel = require('../models/bookingModel');
const userModel = require('../models/userModel');
const pool = require('../config/db');

const getStats = asyncHandler(async (req, res) => {
  const stats = await bookingModel.adminStats();
  res.json({ success: true, data: stats });
});

const listOrganisers = asyncHandler(async (req, res) => {
  const organisers = await userModel.listOrganisers();
  res.json({ success: true, data: organisers });
});

const listAllEvents = asyncHandler(async (req, res) => {
  const [rows] = await pool.query(
    `SELECT e.*, v.name AS venue_name, u.name AS organiser_name
     FROM events e JOIN venues v ON v.id = e.venue_id JOIN users u ON u.id = e.organiser_id
     ORDER BY e.created_at DESC`
  );
  res.json({ success: true, data: rows });
});

const listAllBookings = asyncHandler(async (req, res) => {
  const [rows] = await pool.query(
    `SELECT b.id, b.booking_reference, b.status, b.total_amount, b.created_at,
            e.title AS event_title, u.name AS customer_name, u.email AS customer_email
     FROM bookings b JOIN events e ON e.id = b.event_id JOIN users u ON u.id = b.user_id
     ORDER BY b.created_at DESC LIMIT 200`
  );
  res.json({ success: true, data: rows });
});

module.exports = { getStats, listOrganisers, listAllEvents, listAllBookings };
