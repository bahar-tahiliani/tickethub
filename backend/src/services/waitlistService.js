const pool = require('../config/db');
const seatModel = require('../models/seatModel');
const seatHoldModel = require('../models/seatHoldModel');
const waitlistModel = require('../models/waitlistModel');
const userModel = require('../models/userModel');
const eventModel = require('../models/eventModel');
const { sendEmail, waitlistOfferHtml } = require('../utils/mailer');
const { generateToken } = require('../utils/refGenerator');
const ApiError = require('../utils/ApiError');

const OFFER_TTL_MINUTES = Number(process.env.WAITLIST_OFFER_TTL_MINUTES) || 10;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

function formatDateForMysql(date) {
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

async function joinWaitlist({ eventId, categoryId, userId, quantity = 1 }) {
  const waitlistId = await waitlistModel.addToWaitlist({ eventId, categoryId, userId, quantity });
  const position = await waitlistModel.findQueuePosition(eventId, categoryId, waitlistId);
  return { waitlistId, position };
}

/**
 * Called whenever a specific event_seat becomes free (booking cancellation,
 * or a previous waitlist offer expiring). Finds the longest-waiting customer
 * for that seat's category (strict FIFO), reserves the seat for them with a
 * time-limited hold, and emails them a link to complete the booking.
 *
 * If nobody is waiting, the seat is simply left/returned to 'available' for
 * normal browsing - the caller is responsible for that when this returns null.
 */
async function offerSeatToNextInQueue(eventSeatId) {
  const conn = await pool.getConnection();
  let offerResult = null;
  try {
    await conn.beginTransaction();

    const [[seatRow]] = await conn.query(
      `SELECT es.id AS event_seat_id, es.event_id, es.status, s.category_id, s.seat_code
       FROM event_seats es JOIN seats s ON s.id = es.seat_id
       WHERE es.id = ? FOR UPDATE`,
      [eventSeatId]
    );
    if (!seatRow || seatRow.status !== 'available') {
      await conn.commit();
      return null; // seat isn't actually free (already re-claimed) - nothing to do
    }

    const nextInLine = await waitlistModel.lockNextWaitingCustomer(conn, seatRow.event_id, seatRow.category_id);
    if (!nextInLine) {
      await conn.commit();
      return null; // no one waiting for this category
    }

    const offerToken = generateToken();
    const expiresAt = new Date(Date.now() + OFFER_TTL_MINUTES * 60 * 1000);
    const expiresAtSql = formatDateForMysql(expiresAt);

    // Reserve the seat: mark it held and create a matching seat_hold owned by
    // the offered customer, using the SAME token as the waitlist offer, so
    // the normal checkout/confirm flow can consume it directly.
    await seatModel.setEventSeatStatus(conn, seatRow.event_seat_id, 'held');
    await seatHoldModel.createHold(conn, {
      eventSeatId: seatRow.event_seat_id,
      userId: nextInLine.user_id,
      holdToken: offerToken,
      expiresAt: expiresAtSql
    });
    await waitlistModel.createOffer(conn, {
      waitlistId: nextInLine.id,
      eventSeatId: seatRow.event_seat_id,
      offerToken,
      expiresAt: expiresAtSql
    });
    await waitlistModel.setWaitlistStatus(conn, nextInLine.id, 'offered');

    await conn.commit();

    offerResult = {
      offerToken,
      userId: nextInLine.user_id,
      eventId: seatRow.event_id,
      seatCode: seatRow.seat_code,
      expiresAt: expiresAt.toISOString()
    };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }

  if (offerResult) {
    await notifyCustomerOfOffer(offerResult);
  }
  return offerResult;
}

async function notifyCustomerOfOffer({ offerToken, userId, eventId, expiresAt }) {
  const [user, event] = await Promise.all([userModel.findById(userId), eventModel.findEventById(eventId)]);
  if (!user || !event) return;

  const [prices] = [(await eventModel.getEventPrices(eventId))];
  const categoryName = prices.length ? prices[0].category_name : 'your requested';

  const minutesRemaining = Math.max(1, Math.round((new Date(expiresAt) - Date.now()) / 60000));
  const offerLink = `${CLIENT_URL}/waitlist/offer/${offerToken}`;

  await sendEmail({
    userId: user.id,
    type: 'waitlist_offer',
    to: user.email,
    subject: `A seat for ${event.title} is available for you!`,
    html: waitlistOfferHtml({
      customerName: user.name,
      eventTitle: event.title,
      seatCategory: categoryName,
      minutesRemaining,
      offerLink
    })
  });
}

async function getOfferByToken(token) {
  const offer = await waitlistModel.findOfferByToken(token);
  if (!offer) throw new ApiError(404, 'This waitlist offer link is invalid.');
  if (offer.status !== 'pending') throw new ApiError(410, 'This waitlist offer is no longer valid.');
  if (new Date(offer.expires_at) <= new Date()) throw new ApiError(410, 'This waitlist offer has expired.');
  return offer;
}

/**
 * Expires a single pending offer: marks it + the waitlist entry as expired,
 * frees the seat, then immediately cascades the offer to the next customer
 * in the queue (if any). Used both by the scheduler sweep and can be called
 * directly for a specific offer.
 */
async function expireOffer(offerId) {
  const conn = await pool.getConnection();
  let eventSeatId;
  try {
    await conn.beginTransaction();
    const [[offer]] = await conn.query(`SELECT * FROM waitlist_offers WHERE id = ? FOR UPDATE`, [offerId]);
    if (!offer || offer.status !== 'pending') {
      await conn.commit();
      return;
    }
    eventSeatId = offer.event_seat_id;

    await seatModel.lockEventSeatsById(conn, [eventSeatId]);
    await seatModel.setEventSeatStatus(conn, eventSeatId, 'available');
    await seatHoldModel.markHoldsStatus(
      conn,
      (await conn.query(`SELECT id FROM seat_holds WHERE hold_token = ? AND status = 'active'`, [offer.offer_token]))[0].map((r) => r.id),
      'expired'
    );
    await waitlistModel.setOfferStatus(conn, offer.id, 'expired');
    await waitlistModel.setWaitlistStatus(conn, offer.waitlist_id, 'expired');

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }

  // Cascade to the next person in line for this seat (outside the previous
  // transaction, since offerSeatToNextInQueue opens its own).
  if (eventSeatId) {
    await offerSeatToNextInQueue(eventSeatId);
  }
}

async function listForUser(userId) {
  return waitlistModel.listWaitlistForUser(userId);
}

module.exports = {
  joinWaitlist,
  offerSeatToNextInQueue,
  getOfferByToken,
  expireOffer,
  listForUser,
  OFFER_TTL_MINUTES
};
