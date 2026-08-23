const pool = require('../config/db');

async function createVenue({ name, location, numRows, seatsPerRow, createdBy }) {
  const [result] = await pool.query(
    `INSERT INTO venues (name, location, num_rows, seats_per_row, created_by) VALUES (?, ?, ?, ?, ?)`,
    [name, location, numRows, seatsPerRow, createdBy]
  );
  return result.insertId;
}

async function updateVenue(id, { name, location, numRows, seatsPerRow }) {
  await pool.query(
    `UPDATE venues SET name = ?, location = ?, num_rows = ?, seats_per_row = ? WHERE id = ?`,
    [name, location, numRows, seatsPerRow, id]
  );
}

async function deleteVenue(id) {
  await pool.query(`DELETE FROM venues WHERE id = ?`, [id]);
}

async function findVenueById(id) {
  const [rows] = await pool.query(`SELECT * FROM venues WHERE id = ?`, [id]);
  return rows[0] || null;
}

async function listVenues() {
  const [rows] = await pool.query(`SELECT * FROM venues ORDER BY created_at DESC`);
  return rows;
}

async function createSeatCategory({ venueId, name, colorCode }) {
  const [result] = await pool.query(
    `INSERT INTO seat_categories (venue_id, name, color_code) VALUES (?, ?, ?)`,
    [venueId, name, colorCode || '#6b7280']
  );
  return result.insertId;
}

async function listSeatCategories(venueId) {
  const [rows] = await pool.query(`SELECT * FROM seat_categories WHERE venue_id = ?`, [venueId]);
  return rows;
}

async function bulkInsertSeats(seatRows) {
  // seatRows: [[venue_id, category_id, row_label, seat_number, seat_code], ...]
  if (seatRows.length === 0) return;
  await pool.query(
    `INSERT INTO seats (venue_id, category_id, row_label, seat_number, seat_code) VALUES ?`,
    [seatRows]
  );
}

async function listSeatsByVenue(venueId) {
  const [rows] = await pool.query(
    `SELECT s.*, sc.name AS category_name, sc.color_code
     FROM seats s JOIN seat_categories sc ON sc.id = s.category_id
     WHERE s.venue_id = ? ORDER BY s.row_label, s.seat_number`,
    [venueId]
  );
  return rows;
}

async function deleteSeatsByVenue(venueId) {
  await pool.query(`DELETE FROM seats WHERE venue_id = ?`, [venueId]);
}

module.exports = {
  createVenue,
  updateVenue,
  deleteVenue,
  findVenueById,
  listVenues,
  createSeatCategory,
  listSeatCategories,
  bulkInsertSeats,
  listSeatsByVenue,
  deleteSeatsByVenue
};
