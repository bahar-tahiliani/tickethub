const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const eventController = require('../controllers/eventController');
const seatController = require('../controllers/seatController');

const router = express.Router();

// Public browsing
router.get('/', eventController.listEvents);

// Organiser-only (must come before "/:id" so "mine"/"revenue" aren't parsed as an id)
router.get('/mine/list', authenticate, authorize('organiser'), eventController.myEvents);
router.get('/mine/revenue', authenticate, authorize('organiser'), eventController.revenueSummary);

router.get('/:id', eventController.getEvent);
router.get('/:id/seats', seatController.getSeatMap);
router.get('/:id/bookings', authenticate, authorize('organiser', 'admin'), eventController.eventBookings);
router.post('/', authenticate, authorize('organiser'), eventController.createEvent);
router.put('/:id', authenticate, authorize('organiser', 'admin'), eventController.updateEvent);
router.delete('/:id', authenticate, authorize('organiser', 'admin'), eventController.deleteEvent);

module.exports = router;
