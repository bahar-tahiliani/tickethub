const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const seatController = require('../controllers/seatController');

const router = express.Router();

router.post('/hold', authenticate, authorize('customer'), seatController.holdSeats);
router.post('/release', authenticate, authorize('customer'), seatController.releaseSeats);

module.exports = router;
