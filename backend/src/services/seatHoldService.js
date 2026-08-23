const pool = require('../config/db');
const seatModel = require('../models/seatModel');
const seatHoldModel = require('../models/seatHoldModel');
const ApiError = require('../utils/ApiError');
const { generateToken } = require('../utils/refGenerator');

const HOLD_TTL_MINUTES = Number(process.env.SEAT_HOLD_TTL_MINUTES) || 10;

/**
 * Places a hold on one or more seats for an event.
 *
 * Concurrency protection: everything happens inside a single DB transaction
 * that takes row-level locks (SELECT ... FOR UPDATE) on the target
 * event_seats rows before checking their status. If Customer A and Customer B
 * both try to hold seat A5 at the same time, MySQL's InnoDB row locking
 * guarantees the second transaction blocks until the first commits or rolls
 * back - so the second transaction always sees the seat's *post-first-
 * transaction* status (held/booked), never a stale "available" snapshot.
 * This eliminates the classic read-then-write race condition.
 */
async function holdSeats({ eventId, seatCodes, userId }) {
  if (!Array.isArray(seatCodes) || seatCodes.length === 0) {
    throw new ApiError(400, 'Select at least one seat to hold.');
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const lockedSeats = await seatModel.lockEventSeatsByCode(conn, eventId, seatCodes);

    if (lockedSeats.length !== seatCodes.length) {
      const foundCodes = lockedSeats.map((s) => s.seat_code);
      const missing = seatCodes.filter((c) => !foundCodes.includes(c));
      throw new ApiError(404, `Seat(s) not found for this event: ${missing.join(', ')}`);
    }

    const unavailable = lockedSeats.filter((s) => s.status !== 'available');
    if (unavailable.length > 0) {
      const codes = unavailable.map((s) => s.seat_code).join(', ');
      throw new ApiError(
        409,
        `Sorry, this seat has just been selected by another customer: ${codes}`
      );
    }

    const holdToken = generateToken();
    const expiresAt = new Date(Date.now() + HOLD_TTL_MINUTES * 60 * 1000);
    const expiresAtSql = formatDateForMysql(expiresAt);

    for (const seat of lockedSeats) {
      await seatModel.setEventSeatStatus(conn, seat.event_seat_id, 'held');
      await seatHoldModel.createHold(conn, {
        eventSeatId: seat.event_seat_id,
        userId,
        holdToken,
        expiresAt: expiresAtSql
      });
    }

    await conn.commit();

    return {
      holdToken,
      expiresAt: expiresAt.toISOString(),
      ttlSeconds: HOLD_TTL_MINUTES * 60,
      seats: lockedSeats.map((s) => ({ seatCode: s.seat_code, categoryId: s.category_id }))
    };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

/**
 * Releases an active hold (checkout abandoned or explicitly cancelled by the
 * customer). Only the user who created the hold may release it.
 */
async function releaseHold({ holdToken, userId }) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const holds = await seatHoldModel.findActiveHoldsByToken(holdToken);
    const ownHolds = holds.filter((h) => h.user_id === userId);

    if (ownHolds.length === 0) {
      await conn.commit();
      return { released: 0 };
    }

    const eventSeatIds = ownHolds.map((h) => h.event_seat_id);
    // Re-lock the seats before flipping them back to available, to stay
    // consistent even if a scheduler sweep is running concurrently.
    await seatModel.lockEventSeatsById(conn, eventSeatIds);
    await seatModel.setEventSeatStatusBulk(conn, eventSeatIds, 'available');
    await seatHoldModel.markHoldsStatus(conn, ownHolds.map((h) => h.id), 'released');

    await conn.commit();
    return { released: ownHolds.length };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

/**
 * Converts active holds into a definitively 'booked' state. Used by
 * bookingService right before creating the booking row, inside the same
 * caller-provided transaction so the hold-check and booking-creation are
 * atomic together.
 */
async function convertHoldsToBooked(conn, { holdToken, userId, eventId }) {
  const holds = await seatHoldModel.findActiveHoldsByToken(holdToken);
  const ownHolds = holds.filter((h) => h.user_id === userId && h.event_id === eventId);

  if (ownHolds.length === 0) {
    throw new ApiError(410, 'Your seat hold has expired. Please select your seats again.');
  }

  const eventSeatIds = ownHolds.map((h) => h.event_seat_id);
  const lockedSeats = await seatModel.lockEventSeatsById(conn, eventSeatIds);

  const notHeld = lockedSeats.filter((s) => s.status !== 'held');
  if (notHeld.length > 0) {
    throw new ApiError(410, 'Your seat hold has expired. Please select your seats again.');
  }

  await seatModel.setEventSeatStatusBulk(conn, eventSeatIds, 'booked');
  await seatHoldModel.markHoldsStatus(conn, ownHolds.map((h) => h.id), 'converted');

  return lockedSeats; // includes event_seat_id, seat_code, category_id
}

function formatDateForMysql(date) {
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

module.exports = { holdSeats, releaseHold, convertHoldsToBooked, HOLD_TTL_MINUTES };
