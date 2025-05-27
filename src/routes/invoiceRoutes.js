// routes/testInvoice.js
const express = require('express');
const router = express.Router();
const path = require('path');
const invoiceController  = require('../controllers/invoiceController');

router.post('/invoice',invoiceController.createInvoice);

module.exports = router;
