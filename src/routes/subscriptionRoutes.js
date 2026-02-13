const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscriptionController');

// POST: /api/subscribe_user
router.post('/subscribe_user', subscriptionController.createSubscription);
router.post('/cancel_subscription', subscriptionController.cancelSubscription);
router.get('/get_user_subscriptions/:subscriptionID', subscriptionController.getUserSubscriptionsBySubscriptionsId);

module.exports = router;
