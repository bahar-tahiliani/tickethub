const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const bookingController = require('../controllers/bookingController');

const router = express.Router();

router.use(authenticate, authorize('customer'));

router.post('/', bookingController.createBooking);
router.get('/', bookingController.listMyBookings);
router.get('/:id', bookingController.getBooking);
router.delete('/:id', bookingController.cancelBooking);

module.exports = router;
