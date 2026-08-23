const pool = require('../config/db');

async function createEvent(conn, { organiserId, venueId, title, description, eventType, posterUrl, eventDate, eventTime }) {
  const [result] = await conn.query(
    `INSERT INTO events (organiser_id, venue_id, title, description, event_type, poster_url, event_date, event_time)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [organiserId, venueId, title, description || null, eventType, posterUrl || null, eventDate, eventTime]
  );
  return result.insertId;
}

async function setEventPrices(conn, eventId, prices) {
  // prices: [{ categoryId, price }]
  if (prices.length === 0) return;
  const rows = prices.map((p) => [eventId, p.categoryId, p.price]);
  await conn.query(`INSERT INTO event_prices (event_id, category_id, price) VALUES ?`, [rows]);
}

async function replaceEventPrices(conn, eventId, prices) {
  await conn.query(`DELETE FROM event_prices WHERE event_id = ?`, [eventId]);
  await setEventPrices(conn, eventId, prices);
}

async function initializeEventSeats(conn, eventId, venueId) {
  // Snapshot every physical seat in the venue into event_seats as 'available'
  // (skips inactive/broken seats, which become 'unavailable').
  await conn.query(
    `INSERT INTO event_seats (event_id, seat_id, status)
     SELECT ?, id, IF(is_active, 'available', 'unavailable') FROM seats WHERE venue_id = ?`,
    [eventId, venueId]
  );
}

async function updateEvent(id, { title, description, eventType, posterUrl, eventDate, eventTime, status }) {
  await pool.query(
    `UPDATE events SET title = ?, description = ?, event_type = ?, poster_url = ?, event_date = ?, event_time = ?, status = ?
     WHERE id = ?`,
    [title, description || null, eventType, posterUrl || null, eventDate, eventTime, status, id]
  );
}

async function deleteEvent(id) {
  await pool.query(`DELETE FROM events WHERE id = ?`, [id]);
}

async function findEventById(id) {
  const [rows] = await pool.query(
    `SELECT e.*, v.name AS venue_name, v.location AS venue_location, u.name AS organiser_name
     FROM events e
     JOIN venues v ON v.id = e.venue_id
     JOIN users u ON u.id = e.organiser_id
     WHERE e.id = ?`,
    [id]
  );
  return rows[0] || null;
}

async function listEvents({ eventType, search, dateFrom, dateTo, venueId, organiserId, maxPrice, sort }) {
  const clauses = [`e.status = 'published'`];
  const params = [];

  if (eventType) {
    clauses.push(`e.event_type = ?`);
    params.push(eventType);
  }
  if (search) {
    clauses.push(`e.title LIKE ?`);
    params.push(`%${search}%`);
  }
  if (dateFrom) {
    clauses.push(`e.event_date >= ?`);
    params.push(dateFrom);
  }
  if (dateTo) {
    clauses.push(`e.event_date <= ?`);
    params.push(dateTo);
  }
  if (venueId) {
    clauses.push(`e.venue_id = ?`);
    params.push(venueId);
  }
  if (organiserId) {
    clauses.push(`e.organiser_id = ?`);
    params.push(organiserId);
  }

  let having = '';
  if (maxPrice) {
    having = `HAVING starting_price <= ?`;
    params.push(maxPrice);
  }

  let orderBy = `e.event_date ASC, e.event_time ASC`;
  if (sort === 'price_asc') orderBy = `starting_price ASC`;
  if (sort === 'price_desc') orderBy = `starting_price DESC`;
  if (sort === 'newest') orderBy = `e.created_at DESC`;

  const [rows] = await pool.query(
    `SELECT e.id, e.title, e.event_type, e.poster_url, e.event_date, e.event_time,
            v.name AS venue_name, v.location AS venue_location,
            MIN(ep.price) AS starting_price
     FROM events e
     JOIN venues v ON v.id = e.venue_id
     LEFT JOIN event_prices ep ON ep.event_id = e.id
     WHERE ${clauses.join(' AND ')}
     GROUP BY e.id
     ${having}
     ORDER BY ${orderBy}`,
    params
  );
  return rows;
}

async function listEventsByOrganiser(organiserId) {
  const [rows] = await pool.query(
    `SELECT e.*, v.name AS venue_name FROM events e JOIN venues v ON v.id = e.venue_id
     WHERE e.organiser_id = ? ORDER BY e.event_date DESC`,
    [organiserId]
  );
  return rows;
}

async function getEventPrices(eventId) {
  const [rows] = await pool.query(
    `SELECT ep.category_id, ep.price, sc.name AS category_name, sc.color_code
     FROM event_prices ep JOIN seat_categories sc ON sc.id = ep.category_id
     WHERE ep.event_id = ?`,
    [eventId]
  );
  return rows;
}

async function getEventSeatMap(eventId) {
  const [rows] = await pool.query(
    `SELECT es.id AS event_seat_id, es.status, es.version, s.row_label, s.seat_number, s.seat_code,
            s.category_id, sc.name AS category_name, sc.color_code, ep.price
     FROM event_seats es
     JOIN seats s ON s.id = es.seat_id
     JOIN seat_categories sc ON sc.id = s.category_id
     LEFT JOIN event_prices ep ON ep.event_id = es.event_id AND ep.category_id = s.category_id
     WHERE es.event_id = ?
     ORDER BY s.row_label, s.seat_number`,
    [eventId]
  );
  return rows;
}

async function seatAvailabilityByCategory(eventId) {
  const [rows] = await pool.query(
    `SELECT s.category_id, sc.name AS category_name,
            SUM(es.status = 'available') AS available_count,
            COUNT(*) AS total_count
     FROM event_seats es
     JOIN seats s ON s.id = es.seat_id
     JOIN seat_categories sc ON sc.id = s.category_id
     WHERE es.event_id = ?
     GROUP BY s.category_id, sc.name`,
    [eventId]
  );
  return rows;
}

async function organiserRevenueSummary(organiserId) {
  // Note: booking_seats rows are deleted when a booking is cancelled (see
  // bookingModel.cancelBooking), so every remaining booking_seats row here
  // represents an active, confirmed ticket - no need to re-check booking status.
  const [rows] = await pool.query(
    `SELECT e.id AS event_id, e.title, e.event_date, v.name AS venue_name,
            COUNT(DISTINCT bs.id) AS tickets_sold,
            COALESCE(SUM(bs.price), 0) AS revenue,
            (SELECT COUNT(*) FROM event_seats es2 WHERE es2.event_id = e.id AND es2.status = 'available') AS available_seats
     FROM events e
     JOIN venues v ON v.id = e.venue_id
     LEFT JOIN event_seats es ON es.event_id = e.id
     LEFT JOIN booking_seats bs ON bs.event_seat_id = es.id
     WHERE e.organiser_id = ?
     GROUP BY e.id
     ORDER BY e.event_date DESC`,
    [organiserId]
  );
  return rows;
}

module.exports = {
  createEvent,
  setEventPrices,
  replaceEventPrices,
  initializeEventSeats,
  updateEvent,
  deleteEvent,
  findEventById,
  listEvents,
  listEventsByOrganiser,
  getEventPrices,
  getEventSeatMap,
  seatAvailabilityByCategory,
  organiserRevenueSummary
};
