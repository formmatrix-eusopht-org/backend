const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscriptionController');

// POST: /api/subscribe_user
router.post('/subscribe_user', subscriptionController.createSubscription);

module.exports = router;
