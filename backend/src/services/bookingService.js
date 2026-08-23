const pool = require('../config/db');
const ApiError = require('../utils/ApiError');
const seatHoldService = require('./seatHoldService');
const waitlistService = require('./waitlistService');
const bookingModel = require('../models/bookingModel');
const eventModel = require('../models/eventModel');
const userModel = require('../models/userModel');
const { generateBookingReference } = require('../utils/refGenerator');
const { generateQrCodeDataUrl } = require('../utils/qrcode');
const { sendEmail, bookingConfirmationHtml } = require('../utils/mailer');

/**
 * Confirms a booking from an active seat hold. Runs the hold->booked
 * conversion and the booking/booking_seats inserts inside ONE transaction,
 * so a crash or concurrent expiry sweep can never leave seats "booked"
 * without a corresponding booking row, or vice versa.
 */
async function confirmBooking({ holdToken, userId, eventId }) {
  const [event, prices, user] = await Promise.all([
    eventModel.findEventById(eventId),
    eventModel.getEventPrices(eventId),
    userModel.findById(userId)
  ]);
  if (!event) throw new ApiError(404, 'Event not found.');

  const priceByCategory = new Map(prices.map((p) => [p.category_id, Number(p.price)]));

  const conn = await pool.getConnection();
  let bookingId, bookedSeats, totalAmount;
  try {
    await conn.beginTransaction();

    bookedSeats = await seatHoldService.convertHoldsToBooked(conn, { holdToken, userId, eventId });

    totalAmount = bookedSeats.reduce((sum, s) => sum + (priceByCategory.get(s.category_id) || 0), 0);
    const bookingReference = generateBookingReference();

    bookingId = await bookingModel.createBooking(conn, {
      bookingReference,
      userId,
      eventId,
      totalAmount,
      qrCodeData: bookingReference
    });

    await bookingModel.addBookingSeats(
      conn,
      bookingId,
      bookedSeats.map((s) => ({ eventSeatId: s.event_seat_id, price: priceByCategory.get(s.category_id) || 0 }))
    );

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }

  const booking = await bookingModel.getBookingDetails(bookingId);
  const qrDataUrl = await generateQrCodeDataUrl(booking.booking_reference);

  // Email is best-effort and must not fail the booking itself.
  sendEmail({
    userId,
    type: 'booking_confirmation',
    to: user.email,
    subject: `Your TicketHub booking is confirmed - ${event.title}`,
    html: bookingConfirmationHtml({
      customerName: user.name,
      eventTitle: event.title,
      venueName: event.venue_name,
      eventDate: event.event_date,
      eventTime: event.event_time,
      seatCodes: booking.seats.map((s) => s.seat_code),
      bookingReference: booking.booking_reference,
      totalAmount: booking.total_amount
    }),
    attachments: [
      {
        filename: 'ticket-qr.png',
        content: qrDataUrl.split('base64,')[1],
        encoding: 'base64',
        cid: 'qrcode'
      }
    ]
  }).catch((e) => console.error('[bookingService] confirmation email failed:', e.message));

  return { booking, qrDataUrl };
}

async function getBookingForCustomer(bookingId, userId) {
  const booking = await bookingModel.getBookingDetails(bookingId);
  if (!booking) throw new ApiError(404, 'Booking not found.');
  if (booking.user_id !== userId) throw new ApiError(403, 'This booking does not belong to you.');
  return booking;
}

/**
 * Cancels a booking: releases each seat back to the map and, for every seat
 * freed, checks whether anyone is on that seat category's waitlist and
 * triggers the auto-assignment offer flow.
 */
async function cancelBooking(bookingId, userId) {
  const booking = await bookingModel.findBookingById(bookingId);
  if (!booking) throw new ApiError(404, 'Booking not found.');
  if (booking.user_id !== userId) throw new ApiError(403, 'This booking does not belong to you.');
  if (booking.status === 'cancelled') throw new ApiError(400, 'This booking is already cancelled.');

  const seatRows = await bookingModel.listSeatCodesForBooking(bookingId);
  const eventSeatIds = seatRows.map((r) => r.event_seat_id);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(`SELECT id FROM event_seats WHERE id IN (?) FOR UPDATE`, [eventSeatIds]);
    await conn.query(`UPDATE event_seats SET status = 'available', version = version + 1 WHERE id IN (?)`, [eventSeatIds]);
    await bookingModel.deleteBookingSeats(conn, bookingId);
    await bookingModel.cancelBookingRow(conn, bookingId);
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }

  // Trigger waitlist auto-assignment for each freed seat (outside the main
  // transaction - offerSeatToNextInQueue manages its own).
  for (const eventSeatId of eventSeatIds) {
    waitlistService.offerSeatToNextInQueue(eventSeatId).catch((e) =>
      console.error('[bookingService] waitlist offer cascade failed:', e.message)
    );
  }

  return { cancelled: true, seatsReleased: seatRows.map((r) => r.seat_code) };
}

async function verifyBookingByReference(reference) {
  const booking = await bookingModel.findBookingByReference(reference);

  if (!booking) {
    throw new ApiError(404, 'Ticket not found.');
  }

  const details = await bookingModel.getBookingDetails(booking.id);

  return {
    valid: booking.status === 'confirmed',
    bookingReference: details.booking_reference,
    status: details.status,
    eventTitle: details.event_title,
    venueName: details.venue_name,
    venueLocation: details.venue_location,
    eventDate: details.event_date,
    eventTime: details.event_time,
    seats: details.seats.map((seat) => ({
      seatCode: seat.seat_code,
      categoryName: seat.category_name,
      price: seat.price
    })),
    totalAmount: details.total_amount
  };
}

module.exports = {
  confirmBooking,
  getBookingForCustomer,
  cancelBooking,
  verifyBookingByReference
};
