const pool = require('../config/db');

async function createHold(conn, { eventSeatId, userId, holdToken, expiresAt }) {
  const [result] = await conn.query(
    `INSERT INTO seat_holds (event_seat_id, user_id, hold_token, status, expires_at)
     VALUES (?, ?, ?, 'active', ?)`,
    [eventSeatId, userId, holdToken, expiresAt]
  );
  return result.insertId;
}

async function findActiveHoldsByToken(holdToken) {
  const [rows] = await pool.query(
    `SELECT sh.*, es.event_id, s.seat_code
     FROM seat_holds sh
     JOIN event_seats es ON es.id = sh.event_seat_id
     JOIN seats s ON s.id = es.seat_id
     WHERE sh.hold_token = ? AND sh.status = 'active'`,
    [holdToken]
  );
  return rows;
}

async function findActiveHoldsByUserAndEvent(userId, eventId) {
  const [rows] = await pool.query(
    `SELECT sh.*, es.event_id, s.seat_code, s.category_id
     FROM seat_holds sh
     JOIN event_seats es ON es.id = sh.event_seat_id
     JOIN seats s ON s.id = es.seat_id
     WHERE sh.user_id = ? AND es.event_id = ? AND sh.status = 'active'`,
    [userId, eventId]
  );
  return rows;
}

async function markHoldsStatus(conn, holdIds, status) {
  if (holdIds.length === 0) return;
  await conn.query(`UPDATE seat_holds SET status = ? WHERE id IN (?)`, [status, holdIds]);
}

// Used by the scheduler: finds active holds whose TTL has passed.
async function findExpiredActiveHolds(conn) {
  const [rows] = await conn.query(
    `SELECT sh.id, sh.event_seat_id
     FROM seat_holds sh
     WHERE sh.status = 'active' AND sh.expires_at <= UTC_TIMESTAMP()
     FOR UPDATE`,
  );
  return rows;
}

module.exports = {
  createHold,
  findActiveHoldsByToken,
  findActiveHoldsByUserAndEvent,
  markHoldsStatus,
  findExpiredActiveHolds
};
