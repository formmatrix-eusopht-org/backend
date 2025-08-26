const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscriptionController');

// POST: /api/create_subscription
router.post('/store_subscription', subscriptionController.createSubscription);

module.exports = router;
