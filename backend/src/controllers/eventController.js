const pool = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const eventModel = require('../models/eventModel');
const venueModel = require('../models/venueModel');

const listEvents = asyncHandler(async (req, res) => {
  const { type, search, dateFrom, dateTo, venueId, maxPrice, sort } = req.query;
  const events = await eventModel.listEvents({
    eventType: type,
    search,
    dateFrom,
    dateTo,
    venueId,
    maxPrice,
    sort
  });
  res.json({ success: true, data: events });
});

const getEvent = asyncHandler(async (req, res) => {
  const event = await eventModel.findEventById(req.params.id);
  if (!event) throw new ApiError(404, 'Event not found.');
  const prices = await eventModel.getEventPrices(event.id);
  const availability = await eventModel.seatAvailabilityByCategory(event.id);
  res.json({ success: true, data: { ...event, prices, availability } });
});

const createEvent = asyncHandler(async (req, res) => {
  const { venueId, title, description, eventType, posterUrl, eventDate, eventTime, prices } = req.body;

  if (!venueId || !title || !eventType || !eventDate || !eventTime) {
    throw new ApiError(400, 'venueId, title, eventType, eventDate and eventTime are required.');
  }
  if (!Array.isArray(prices) || prices.length === 0) {
    throw new ApiError(400, 'At least one seat-category price is required.');
  }

  const venue = await venueModel.findVenueById(venueId);
  if (!venue) throw new ApiError(404, 'Venue not found.');

  const conn = await pool.getConnection();
  let eventId;
  try {
    await conn.beginTransaction();
    eventId = await eventModel.createEvent(conn, {
      organiserId: req.user.id,
      venueId,
      title,
      description,
      eventType,
      posterUrl,
      eventDate,
      eventTime
    });
    await eventModel.setEventPrices(conn, eventId, prices.map((p) => ({ categoryId: p.categoryId, price: p.price })));
    await eventModel.initializeEventSeats(conn, eventId, venueId);
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }

  res.status(201).json({ success: true, data: await eventModel.findEventById(eventId) });
});

const updateEvent = asyncHandler(async (req, res) => {
  const event = await eventModel.findEventById(req.params.id);
  if (!event) throw new ApiError(404, 'Event not found.');
  if (req.user.role === 'organiser' && event.organiser_id !== req.user.id) {
    throw new ApiError(403, 'You can only edit your own events.');
  }

  const { title, description, eventType, posterUrl, eventDate, eventTime, status, prices } = req.body;
  await eventModel.updateEvent(event.id, {
    title: title ?? event.title,
    description: description ?? event.description,
    eventType: eventType ?? event.event_type,
    posterUrl: posterUrl ?? event.poster_url,
    eventDate: eventDate ?? event.event_date,
    eventTime: eventTime ?? event.event_time,
    status: status ?? event.status
  });

  if (Array.isArray(prices) && prices.length > 0) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await eventModel.replaceEventPrices(conn, event.id, prices.map((p) => ({ categoryId: p.categoryId, price: p.price })));
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  res.json({ success: true, data: await eventModel.findEventById(event.id) });
});

const deleteEvent = asyncHandler(async (req, res) => {
  const event = await eventModel.findEventById(req.params.id);
  if (!event) throw new ApiError(404, 'Event not found.');
  if (req.user.role === 'organiser' && event.organiser_id !== req.user.id) {
    throw new ApiError(403, 'You can only delete your own events.');
  }
  await eventModel.deleteEvent(event.id);
  res.json({ success: true, message: 'Event deleted.' });
});

const myEvents = asyncHandler(async (req, res) => {
  const events = await eventModel.listEventsByOrganiser(req.user.id);
  res.json({ success: true, data: events });
});

const revenueSummary = asyncHandler(async (req, res) => {
  const summary = await eventModel.organiserRevenueSummary(req.user.id);
  const totals = summary.reduce(
    (acc, e) => ({
      totalEvents: acc.totalEvents + 1,
      totalBookings: acc.totalBookings + Number(e.tickets_sold),
      totalRevenue: acc.totalRevenue + Number(e.revenue)
    }),
    { totalEvents: 0, totalBookings: 0, totalRevenue: 0 }
  );
  res.json({ success: true, data: { events: summary, totals } });
});

const eventBookings = asyncHandler(async (req, res) => {
  const event = await eventModel.findEventById(req.params.id);
  if (!event) throw new ApiError(404, 'Event not found.');
  if (req.user.role === 'organiser' && event.organiser_id !== req.user.id) {
    throw new ApiError(403, 'You can only view bookings for your own events.');
  }
  const [rows] = await pool.query(
    `SELECT b.id, b.booking_reference, b.status, b.total_amount, b.created_at,
            u.name AS customer_name, u.email AS customer_email,
            GROUP_CONCAT(s.seat_code ORDER BY s.seat_code SEPARATOR ', ') AS seats
     FROM bookings b
     JOIN users u ON u.id = b.user_id
     LEFT JOIN booking_seats bs ON bs.booking_id = b.id
     LEFT JOIN event_seats es ON es.id = bs.event_seat_id
     LEFT JOIN seats s ON s.id = es.seat_id
     WHERE b.event_id = ?
     GROUP BY b.id
     ORDER BY b.created_at DESC`,
    [event.id]
  );
  res.json({ success: true, data: rows });
});

module.exports = {
  listEvents,
  getEvent,
  createEvent,
  updateEvent,
  deleteEvent,
  myEvents,
  revenueSummary,
  eventBookings
};
