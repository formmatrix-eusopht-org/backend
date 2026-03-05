
// src/routes/transactionRoutes.js
const express = require('express');
const transactionController = require('../controllers/transactionController');
const pdfController = require('../controllers/pdfController');
const router = express.Router();

router.post('/save', transactionController.createTransaction);

router.post('/update', transactionController.updateTransaction);

router.get('/get_user_transactions', transactionController.getUserTransactions);

router.get('/getRecent', transactionController.getTransactions);

router.delete('/delete/:id', transactionController.deleteTransaction);

router.post('/fillpdf', pdfController.generatePDF);


module.exports = router;