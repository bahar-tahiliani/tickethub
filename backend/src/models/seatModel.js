const pool = require('../config/db');

// Locks the given event_seat rows with SELECT ... FOR UPDATE inside an
// existing transaction. Any other transaction trying to lock the same rows
// will block until this one commits/rolls back - this is the mechanism that
// makes concurrent hold/booking attempts on the same seat mutually exclusive.
async function lockEventSeatsByCode(conn, eventId, seatCodes) {
  const [rows] = await conn.query(
    `SELECT es.id AS event_seat_id, es.status, es.version, s.seat_code, s.category_id
     FROM event_seats es
     JOIN seats s ON s.id = es.seat_id
     WHERE es.event_id = ? AND s.seat_code IN (?)
     FOR UPDATE`,
    [eventId, seatCodes]
  );
  return rows;
}

async function lockEventSeatsById(conn, eventSeatIds) {
  const [rows] = await conn.query(
    `SELECT es.id AS event_seat_id, es.status, es.version, s.seat_code, s.category_id
     FROM event_seats es
     JOIN seats s ON s.id = es.seat_id
     WHERE es.id IN (?)
     FOR UPDATE`,
    [eventSeatIds]
  );
  return rows;
}

async function setEventSeatStatus(conn, eventSeatId, status) {
  await conn.query(
    `UPDATE event_seats SET status = ?, version = version + 1 WHERE id = ?`,
    [status, eventSeatId]
  );
}

async function setEventSeatStatusBulk(conn, eventSeatIds, status) {
  if (eventSeatIds.length === 0) return;
  await conn.query(
    `UPDATE event_seats SET status = ?, version = version + 1 WHERE id IN (?)`,
    [status, eventSeatIds]
  );
}

async function getEventSeatById(id) {
  const [rows] = await pool.query(
    `SELECT es.*, s.seat_code, s.category_id, s.row_label, s.seat_number
     FROM event_seats es JOIN seats s ON s.id = es.seat_id WHERE es.id = ?`,
    [id]
  );
  return rows[0] || null;
}

module.exports = {
  lockEventSeatsByCode,
  lockEventSeatsById,
  setEventSeatStatus,
  setEventSeatStatusBulk,
  getEventSeatById
};
