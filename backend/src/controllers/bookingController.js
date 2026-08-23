const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const bookingService = require('../services/bookingService');
const bookingModel = require('../models/bookingModel');

const createBooking = asyncHandler(async (req, res) => {
  const { eventId, holdToken } = req.body;
  if (!eventId || !holdToken) throw new ApiError(400, 'eventId and holdToken are required.');

  const { booking, qrDataUrl } = await bookingService.confirmBooking({
    holdToken,
    userId: req.user.id,
    eventId
  });
  res.status(201).json({ success: true, data: { ...booking, qrDataUrl } });
});

const listMyBookings = asyncHandler(async (req, res) => {
  const bookings = await bookingModel.listBookingsByUser(req.user.id);
  res.json({ success: true, data: bookings });
});

const getBooking = asyncHandler(async (req, res) => {
  const booking = await bookingService.getBookingForCustomer(req.params.id, req.user.id);
  res.json({ success: true, data: booking });
});

const cancelBooking = asyncHandler(async (req, res) => {
  const result = await bookingService.cancelBooking(req.params.id, req.user.id);
  res.json({ success: true, data: result });
});

module.exports = { createBooking, listMyBookings, getBooking, cancelBooking };
