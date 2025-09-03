// src/models/transaction.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const transactionSchema = new Schema({
    userId: { type: String, required: true },
    transactionType: { type: Array, required: true },
    formData: { type: Object, required: true },
    createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.models.Transaction || mongoose.model('Transaction', transactionSchema);