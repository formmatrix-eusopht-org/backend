
// src/routes/transactionRoutes.js
const express = require('express');
const transactionController = require('../controllers/transactionController');
const pdfController = require('../controllers/pdfController');
const router = express.Router();

router.post('/save', transactionController.createTransaction);

router.get('/getRecent', transactionController.getTransactions);

router.post('/update', transactionController.updateTransaction);

router.delete('/delete', transactionController.deleteTransaction);

router.post('/fillpdf', pdfController.generatePDF);


module.exports = router;