const { v4: uuidv4 } = require('uuid');

// Short, human-friendly booking reference, e.g. TKT-7F3K9C2A
function generateBookingReference() {
  const raw = uuidv4().replace(/-/g, '').toUpperCase();
  return `TKT-${raw.slice(0, 8)}`;
}

// Opaque tokens used for seat holds and waitlist offers (not shown to users,
// just used internally / in links) - a full uuid is fine here.
function generateToken() {
  return uuidv4().replace(/-/g, '');
}

module.exports = { generateBookingReference, generateToken };
