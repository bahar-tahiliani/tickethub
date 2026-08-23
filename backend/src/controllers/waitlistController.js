const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const waitlistService = require('../services/waitlistService');
const eventModel = require('../models/eventModel');

const joinWaitlist = asyncHandler(async (req, res) => {
  const { eventId, categoryId, quantity } = req.body;
  if (!eventId || !categoryId) throw new ApiError(400, 'eventId and categoryId are required.');

  const result = await waitlistService.joinWaitlist({
    eventId,
    categoryId,
    userId: req.user.id,
    quantity: quantity || 1
  });
  res.status(201).json({ success: true, data: result });
});

const getEventWaitlist = asyncHandler(async (req, res) => {
  // Organiser/admin visibility into how many people are waiting per category.
  const event = await eventModel.findEventById(req.params.eventId);
  if (!event) throw new ApiError(404, 'Event not found.');
  const availability = await eventModel.seatAvailabilityByCategory(event.id);
  res.json({ success: true, data: availability });
});

const myWaitlist = asyncHandler(async (req, res) => {
  const rows = await waitlistService.listForUser(req.user.id);
  res.json({ success: true, data: rows });
});

// GET /api/waitlist/offer/:token - resolves a time-limited offer link so the
// frontend can show the customer their reserved seat + countdown, then send
// them into the normal checkout flow using the same token as the holdToken.
const getOffer = asyncHandler(async (req, res) => {
  const offer = await waitlistService.getOfferByToken(req.params.token);
  if (offer.user_id !== req.user.id) {
    throw new ApiError(403, 'This offer was not made to you.');
  }
  res.json({
    success: true,
    data: {
      holdToken: offer.offer_token,
      eventId: offer.event_id,
      seatCode: offer.seat_code,
      expiresAt: offer.expires_at
    }
  });
});

module.exports = { joinWaitlist, getEventWaitlist, myWaitlist, getOffer };
