const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const eventModel = require('../models/eventModel');
const seatHoldService = require('../services/seatHoldService');

const getSeatMap = asyncHandler(async (req, res) => {
  const event = await eventModel.findEventById(req.params.id);
  if (!event) throw new ApiError(404, 'Event not found.');
  const seatMap = await eventModel.getEventSeatMap(event.id);
  res.json({ success: true, data: seatMap });
});

const holdSeats = asyncHandler(async (req, res) => {
  const { eventId, seatCodes } = req.body;
  if (!eventId) throw new ApiError(400, 'eventId is required.');
  if (!Array.isArray(seatCodes) || seatCodes.length === 0) {
    throw new ApiError(400, 'Provide at least one seat code to hold.');
  }
  const result = await seatHoldService.holdSeats({
    eventId,
    seatCodes,
    userId: req.user.id
  });
  res.status(201).json({ success: true, data: result });
});

const releaseSeats = asyncHandler(async (req, res) => {
  const { holdToken } = req.body;
  if (!holdToken) throw new ApiError(400, 'holdToken is required.');
  const result = await seatHoldService.releaseHold({ holdToken, userId: req.user.id });
  res.json({ success: true, data: result });
});

module.exports = { getSeatMap, holdSeats, releaseSeats };
