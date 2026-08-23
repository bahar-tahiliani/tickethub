const pool = require('../config/db');

async function addToWaitlist({ eventId, categoryId, userId, quantity }) {
  const [result] = await pool.query(
    `INSERT INTO waitlists (event_id, category_id, user_id, quantity, status) VALUES (?, ?, ?, ?, 'waiting')`,
    [eventId, categoryId, userId, quantity]
  );
  return result.insertId;
}

async function findQueuePosition(eventId, categoryId, waitlistId) {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS position FROM waitlists
     WHERE event_id = ? AND category_id = ? AND status = 'waiting'
       AND created_at <= (SELECT created_at FROM waitlists WHERE id = ?)`,
    [eventId, categoryId, waitlistId]
  );
  return rows[0].position;
}

async function listWaitlistForUser(userId) {
  const [rows] = await pool.query(
    `SELECT w.*, e.title AS event_title, e.event_date, sc.name AS category_name
     FROM waitlists w
     JOIN events e ON e.id = w.event_id
     JOIN seat_categories sc ON sc.id = w.category_id
     WHERE w.user_id = ?
     ORDER BY w.created_at DESC`,
    [userId]
  );
  return rows;
}

// Locks and returns the next customer waiting in line for a category, in
// strict FIFO (queue) order, so waitlist auto-assignment is deterministic
// even if multiple seats free up at once.
async function lockNextWaitingCustomer(conn, eventId, categoryId) {
  const [rows] = await conn.query(
    `SELECT * FROM waitlists
     WHERE event_id = ? AND category_id = ? AND status = 'waiting'
     ORDER BY created_at ASC
     LIMIT 1
     FOR UPDATE`,
    [eventId, categoryId]
  );
  return rows[0] || null;
}

async function setWaitlistStatus(conn, waitlistId, status) {
  await conn.query(`UPDATE waitlists SET status = ? WHERE id = ?`, [status, waitlistId]);
}

async function createOffer(conn, { waitlistId, eventSeatId, offerToken, expiresAt }) {
  const [result] = await conn.query(
    `INSERT INTO waitlist_offers (waitlist_id, event_seat_id, offer_token, status, expires_at)
     VALUES (?, ?, ?, 'pending', ?)`,
    [waitlistId, eventSeatId, offerToken, expiresAt]
  );
  return result.insertId;
}

async function findOfferByToken(token) {
  const [rows] = await pool.query(
    `SELECT wo.*, w.event_id, w.category_id, w.user_id, s.seat_code
     FROM waitlist_offers wo
     JOIN waitlists w ON w.id = wo.waitlist_id
     JOIN event_seats es ON es.id = wo.event_seat_id
     JOIN seats s ON s.id = es.seat_id
     WHERE wo.offer_token = ?`,
    [token]
  );
  return rows[0] || null;
}

async function setOfferStatus(conn, offerId, status) {
  await conn.query(`UPDATE waitlist_offers SET status = ? WHERE id = ?`, [status, offerId]);
}

async function findExpiredPendingOffers(conn) {
  const [rows] = await conn.query(
    `SELECT wo.id, wo.waitlist_id, wo.event_seat_id
     FROM waitlist_offers wo
     WHERE wo.status = 'pending' AND wo.expires_at <= UTC_TIMESTAMP()
     FOR UPDATE`
  );
  return rows;
}

module.exports = {
  addToWaitlist,
  findQueuePosition,
  listWaitlistForUser,
  lockNextWaitingCustomer,
  setWaitlistStatus,
  createOffer,
  findOfferByToken,
  setOfferStatus,
  findExpiredPendingOffers
};
