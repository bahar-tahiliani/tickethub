const express = require('express');
const ticketController = require('../controllers/ticketController');

const router = express.Router();

// Public route used by QR-code ticket verification.
router.get('/verify/:reference', ticketController.verifyTicket);

module.exports = router;
