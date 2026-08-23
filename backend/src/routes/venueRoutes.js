const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const venueController = require('../controllers/venueController');

const router = express.Router();

// Public - anyone browsing events needs venue names for filters, etc.
router.get('/', venueController.listVenues);
router.get('/:id', venueController.getVenue);
router.get('/:id/categories', venueController.listSeatCategories);

// Admin only
router.post('/', authenticate, authorize('admin'), venueController.createVenue);
router.put('/:id', authenticate, authorize('admin'), venueController.updateVenue);
router.delete('/:id', authenticate, authorize('admin'), venueController.deleteVenue);
router.post('/:id/categories', authenticate, authorize('admin'), venueController.createSeatCategory);
router.post('/:id/seats/generate', authenticate, authorize('admin'), venueController.generateSeatLayout);

module.exports = router;
