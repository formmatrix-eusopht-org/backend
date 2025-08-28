const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/stripeWebHook');

router.post('/', webhookController.stripeWebhook);

module.exports = router;
    