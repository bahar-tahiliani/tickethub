const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const bookingService = require('../services/bookingService');

const verifyTicket = asyncHandler(async (req, res) => {
  const reference = req.params.reference?.trim();

  if (!reference) {
    throw new ApiError(400, 'Ticket reference is required.');
  }

  const ticket = await bookingService.verifyBookingByReference(reference);

  res.json({
    success: true,
    data: ticket
  });
});

module.exports = {
  verifyTicket
};
