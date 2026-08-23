const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const adminController = require('../controllers/adminController');

const router = express.Router();

router.use(authenticate, authorize('admin'));

router.get('/stats', adminController.getStats);
router.get('/organisers', adminController.listOrganisers);
router.get('/events', adminController.listAllEvents);
router.get('/bookings', adminController.listAllBookings);

module.exports = router;
