const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const venueModel = require('../models/venueModel');

function rowLabelForIndex(index) {
  // 0 -> A, 1 -> B ... 25 -> Z, 26 -> AA, etc.
  let label = '';
  let n = index;
  do {
    label = String.fromCharCode(65 + (n % 26)) + label;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return label;
}

const listVenues = asyncHandler(async (req, res) => {
  const venues = await venueModel.listVenues();
  res.json({ success: true, data: venues });
});

const getVenue = asyncHandler(async (req, res) => {
  const venue = await venueModel.findVenueById(req.params.id);
  if (!venue) throw new ApiError(404, 'Venue not found.');
  const categories = await venueModel.listSeatCategories(venue.id);
  const seats = await venueModel.listSeatsByVenue(venue.id);
  res.json({ success: true, data: { ...venue, categories, seats } });
});

const createVenue = asyncHandler(async (req, res) => {
  const { name, location, numRows, seatsPerRow } = req.body;
  if (!name || !location || !numRows || !seatsPerRow) {
    throw new ApiError(400, 'name, location, numRows and seatsPerRow are required.');
  }
  const id = await venueModel.createVenue({ name, location, numRows, seatsPerRow, createdBy: req.user.id });
  const venue = await venueModel.findVenueById(id);
  res.status(201).json({ success: true, data: venue });
});

const updateVenue = asyncHandler(async (req, res) => {
  const venue = await venueModel.findVenueById(req.params.id);
  if (!venue) throw new ApiError(404, 'Venue not found.');
  const { name, location, numRows, seatsPerRow } = req.body;
  await venueModel.updateVenue(req.params.id, {
    name: name ?? venue.name,
    location: location ?? venue.location,
    numRows: numRows ?? venue.num_rows,
    seatsPerRow: seatsPerRow ?? venue.seats_per_row
  });
  res.json({ success: true, data: await venueModel.findVenueById(req.params.id) });
});

const deleteVenue = asyncHandler(async (req, res) => {
  const venue = await venueModel.findVenueById(req.params.id);
  if (!venue) throw new ApiError(404, 'Venue not found.');
  await venueModel.deleteVenue(req.params.id);
  res.json({ success: true, message: 'Venue deleted.' });
});

const createSeatCategory = asyncHandler(async (req, res) => {
  const venue = await venueModel.findVenueById(req.params.id);
  if (!venue) throw new ApiError(404, 'Venue not found.');
  const { name, colorCode } = req.body;
  if (!name) throw new ApiError(400, 'Category name is required.');
  const id = await venueModel.createSeatCategory({ venueId: venue.id, name, colorCode });
  res.status(201).json({ success: true, data: { id, name, colorCode } });
});

const listSeatCategories = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await venueModel.listSeatCategories(req.params.id) });
});

/**
 * Generates (or regenerates) the full seat layout for a venue: numRows rows
 * x seatsPerRow seats, with each row assigned to a seat category.
 * body: { rowCategoryMap: { "A": categoryId, "B": categoryId, ... } }
 * Any row not present in rowCategoryMap falls back to the first category.
 */
const generateSeatLayout = asyncHandler(async (req, res) => {
  const venue = await venueModel.findVenueById(req.params.id);
  if (!venue) throw new ApiError(404, 'Venue not found.');

  const categories = await venueModel.listSeatCategories(venue.id);
  if (categories.length === 0) {
    throw new ApiError(400, 'Create at least one seat category for this venue before generating seats.');
  }
  const defaultCategoryId = categories[0].id;
  const { rowCategoryMap = {} } = req.body;

  await venueModel.deleteSeatsByVenue(venue.id);

  const seatRows = [];
  for (let r = 0; r < venue.num_rows; r++) {
    const rowLabel = rowLabelForIndex(r);
    const categoryId = rowCategoryMap[rowLabel] || defaultCategoryId;
    for (let seatNum = 1; seatNum <= venue.seats_per_row; seatNum++) {
      seatRows.push([venue.id, categoryId, rowLabel, seatNum, `${rowLabel}${seatNum}`]);
    }
  }
  await venueModel.bulkInsertSeats(seatRows);

  res.status(201).json({ success: true, data: await venueModel.listSeatsByVenue(venue.id) });
});

module.exports = {
  listVenues,
  getVenue,
  createVenue,
  updateVenue,
  deleteVenue,
  createSeatCategory,
  listSeatCategories,
  generateSeatLayout
};
