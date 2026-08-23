const pool = require('../config/db');

async function createBooking(conn, { bookingReference, userId, eventId, totalAmount, qrCodeData }) {
  const [result] = await conn.query(
    `INSERT INTO bookings (booking_reference, user_id, event_id, total_amount, status, qr_code_data)
     VALUES (?, ?, ?, ?, 'confirmed', ?)`,
    [bookingReference, userId, eventId, totalAmount, qrCodeData]
  );
  return result.insertId;
}

async function addBookingSeats(conn, bookingId, seatLines) {
  // seatLines: [{ eventSeatId, price }]
  const rows = seatLines.map((l) => [bookingId, l.eventSeatId, l.price]);
  await conn.query(`INSERT INTO booking_seats (booking_id, event_seat_id, price) VALUES ?`, [rows]);
}

async function findBookingByReference(reference) {
  const [rows] = await pool.query(`SELECT * FROM bookings WHERE booking_reference = ?`, [reference]);
  return rows[0] || null;
}

async function findBookingById(id) {
  const [rows] = await pool.query(`SELECT * FROM bookings WHERE id = ?`, [id]);
  return rows[0] || null;
}

async function getBookingDetails(bookingId) {
  const [[booking]] = await pool.query(
    `SELECT b.*, e.title AS event_title, e.event_date, e.event_time, e.poster_url,
            v.name AS venue_name, v.location AS venue_location, u.name AS customer_name, u.email AS customer_email
     FROM bookings b
     JOIN events e ON e.id = b.event_id
     JOIN venues v ON v.id = e.venue_id
     JOIN users u ON u.id = b.user_id
     WHERE b.id = ?`,
    [bookingId]
  );
  if (!booking) return null;

  const [seats] = await pool.query(
    `SELECT bs.price, s.seat_code, sc.name AS category_name
     FROM booking_seats bs
     JOIN event_seats es ON es.id = bs.event_seat_id
     JOIN seats s ON s.id = es.seat_id
     JOIN seat_categories sc ON sc.id = s.category_id
     WHERE bs.booking_id = ?`,
    [bookingId]
  );
  return { ...booking, seats };
}

async function listBookingsByUser(userId) {
  const [rows] = await pool.query(
    `SELECT b.id, b.booking_reference, b.status, b.total_amount, b.created_at, b.cancelled_at,
            e.id AS event_id, e.title AS event_title, e.event_date, e.event_time, e.poster_url,
            v.name AS venue_name
     FROM bookings b
     JOIN events e ON e.id = b.event_id
     JOIN venues v ON v.id = e.venue_id
     WHERE b.user_id = ?
     ORDER BY b.created_at DESC`,
    [userId]
  );
  return rows;
}

async function listSeatCodesForBooking(bookingId) {
  const [rows] = await pool.query(
    `SELECT s.seat_code, es.id AS event_seat_id
     FROM booking_seats bs
     JOIN event_seats es ON es.id = bs.event_seat_id
     JOIN seats s ON s.id = es.seat_id
     WHERE bs.booking_id = ?`,
    [bookingId]
  );
  return rows;
}

async function cancelBookingRow(conn, bookingId) {
  await conn.query(`UPDATE bookings SET status = 'cancelled', cancelled_at = NOW() WHERE id = ?`, [bookingId]);
}

async function deleteBookingSeats(conn, bookingId) {
  await conn.query(`DELETE FROM booking_seats WHERE booking_id = ?`, [bookingId]);
}

async function adminStats() {
  const [[row]] = await pool.query(
    `SELECT
       (SELECT COUNT(*) FROM users WHERE role = 'customer') AS total_customers,
       (SELECT COUNT(*) FROM users WHERE role = 'organiser') AS total_organisers,
       (SELECT COUNT(*) FROM events) AS total_events,
       (SELECT COUNT(*) FROM venues) AS total_venues,
       (SELECT COUNT(*) FROM bookings WHERE status = 'confirmed') AS total_bookings,
       (SELECT COALESCE(SUM(total_amount),0) FROM bookings WHERE status = 'confirmed') AS total_revenue`
  );
  return row;
}

module.exports = {
  createBooking,
  addBookingSeats,
  findBookingByReference,
  findBookingById,
  getBookingDetails,
  listBookingsByUser,
  listSeatCodesForBooking,
  cancelBookingRow,
  deleteBookingSeats,
  adminStats
};
