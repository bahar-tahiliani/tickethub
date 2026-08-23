const cron = require('node-cron');
const pool = require('../config/db');
const seatModel = require('../models/seatModel');
const seatHoldModel = require('../models/seatHoldModel');
const waitlistService = require('./waitlistService');

const INTERVAL_SECONDS = Number(process.env.SCHEDULER_INTERVAL_SECONDS) || 30;

/**
 * Enforces the seat-hold TTL at the database level: any 'active' hold whose
 * expires_at has passed is swept up here (in addition to the defensive
 * expiry checks already done inline in seatHoldService/bookingService), so
 * abandoned checkouts reliably free their seats even if the customer's
 * browser is closed and no further API calls ever happen.
 *
 * Holds that were created as part of a waitlist time-limited offer are
 * routed through waitlistService.expireOffer so the seat cascades to the
 * next customer in the queue instead of just going back to 'available'.
 */
async function sweepExpiredHolds() {
  const conn = await pool.getConnection();
  let expired = [];
  try {
    await conn.beginTransaction();
    const rows = await seatHoldModel.findExpiredActiveHolds(conn); // [{ id, event_seat_id }]
    if (rows.length === 0) {
      await conn.commit();
      return;
    }

    // Need hold_token for each, to check whether it's a waitlist offer hold.
    const [holdDetails] = await conn.query(
      `SELECT id, event_seat_id, hold_token FROM seat_holds WHERE id IN (?)`,
      [rows.map((r) => r.id)]
    );
    expired = holdDetails;

    const tokens = [...new Set(expired.map((h) => h.hold_token))];
    const [offerRows] = tokens.length
      ? await conn.query(
          `SELECT id, offer_token FROM waitlist_offers WHERE offer_token IN (?) AND status = 'pending'`,
          [tokens]
        )
      : [[]];
    const offerTokenToOfferId = new Map(offerRows.map((o) => [o.offer_token, o.id]));

    const plainHolds = expired.filter((h) => !offerTokenToOfferId.has(h.hold_token));
    const offerHolds = expired.filter((h) => offerTokenToOfferId.has(h.hold_token));

    if (plainHolds.length > 0) {
      const eventSeatIds = plainHolds.map((h) => h.event_seat_id);
      await seatModel.lockEventSeatsById(conn, eventSeatIds);
      await seatModel.setEventSeatStatusBulk(conn, eventSeatIds, 'available');
      await seatHoldModel.markHoldsStatus(conn, plainHolds.map((h) => h.id), 'expired');
    }

    await conn.commit();

    if (plainHolds.length > 0) {
      console.log(`[scheduler] released ${plainHolds.length} expired seat hold(s)`);
    }

    // Handle waitlist-offer holds after committing the plain sweep, since
    // expireOffer manages its own transaction and cascades to the next
    // customer in the queue.
    for (const hold of offerHolds) {
      const offerId = offerTokenToOfferId.get(hold.hold_token);
      try {
        await waitlistService.expireOffer(offerId);
        console.log(`[scheduler] expired waitlist offer ${offerId}, cascading to next customer`);
      } catch (e) {
        console.error(`[scheduler] failed to expire waitlist offer ${offerId}:`, e.message);
      }
    }
  } catch (err) {
    await conn.rollback();
    console.error('[scheduler] sweep failed:', err.message);
  } finally {
    conn.release();
  }
}

function startScheduler() {
  const cronExpression = `*/${Math.max(5, INTERVAL_SECONDS)} * * * * *`; // every N seconds
  cron.schedule(cronExpression, sweepExpiredHolds);
  console.log(`[scheduler] seat-hold/waitlist-offer expiry sweep running every ${INTERVAL_SECONDS}s`);
}

module.exports = { startScheduler, sweepExpiredHolds };
