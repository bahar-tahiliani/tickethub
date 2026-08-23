const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const waitlistController = require('../controllers/waitlistController');

const router = express.Router();

router.post('/', authenticate, authorize('customer'), waitlistController.joinWaitlist);
router.get('/mine', authenticate, authorize('customer'), waitlistController.myWaitlist);
router.get('/offer/:token', authenticate, authorize('customer'), waitlistController.getOffer);
router.get('/:eventId', waitlistController.getEventWaitlist);

module.exports = router;
