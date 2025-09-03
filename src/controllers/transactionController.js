
// src/controllers/transactionController.js
const Transaction = require('../models/transaction');
const transactionPrices = require('../models/transactionPrices');

/**
 * Create a new transaction
 */


const aliasMap = {
    'Name Change/Correction Transfer': 'Name Change',
};

exports.createTransaction = async (req, res) => {
    const { userId, transactionType, formData } = req.body;
    console.log('Received transaction data:', req.body);
    if (!userId || !transactionType || !formData) {
        return res.status(400).json({ error: 'userId, transactionType, and formData are required.' });
    }
    const transaction = await Transaction.create({ userId, transactionType, formData });
    return res.status(200).json({
        message: 'Transaction saved successfully!',
        transactionId: transaction._id,
    });
};

/**
 * Fetch transactions by userId or transactionId
 */
// controller/transactionController.js

exports.getUserTransactions = async (req, res) => {
    const { userId } = req.query;

    if (!userId) {
        return res.status(400).json({ error: "userId is required to fetch transactions." });
    }

    try {
        const transactions = await Transaction.find({ userId }).sort({ createdAt: -1 });

        if (!transactions || transactions.length === 0) {
            return res.status(404).json({ message: "No transactions found for this user." });
        }

        return res.status(200).json({ transactions });
    } catch (error) {
        console.error("Error fetching transactions:", error);
        return res.status(500).json({ error: "Internal server error. Could not fetch transactions." });
    }
};

exports.getTransactions = async (req, res) => {
    const { userId, transactionId } = req.query;
    console.log('Received query parameters:', req.query);
    if (!userId && !transactionId) {
        return res.status(400).json({ error: 'Either userId or transactionId is required to fetch transactions.' });
    }

    try {
        const query = {};
        if (userId) query.userId = userId;
        if (transactionId) query._id = transactionId;

        // always sort by createdAt descending when fetching by user
        let transactions;
        if (transactionId) {
            transactions = await Transaction.find(query);
        } else {
            transactions = await Transaction.find(query).sort({ createdAt: -1 });
        }

        if (!transactions || transactions.length === 0) {
            return res.status(404).json({ message: 'No transactions found.' });
        }
        return res.status(200).json({ transactions });
    } catch (error) {
        console.error('Error fetching transactions:', error);
        return res.status(500).json({ error: 'Internal server error. Could not fetch transactions.' });
    }
};


/**
 * Update an existing transaction
 */
exports.updateTransaction = async (req, res) => {
    const { userId, transactionType, formData, transactionId } = req.body;

    if (!userId || !transactionType || !formData || !transactionId) {
        return res.status(400).json({ error: 'All fields are required for update.' });
    }

    try {
        const updated = await Transaction.findByIdAndUpdate(
            transactionId,
            { userId, transactionType, formData },
            { new: true }
        );

        if (!updated) {
            return res.status(404).json({ error: 'Transaction not found.' });
        }

        return res.status(200).json({
            message: 'Transaction updated successfully!',
            transactionId: updated._id,
        });
    } catch (error) {
        console.error('Error updating transaction:', error);
        return res.status(500).json({ error: 'Internal server error. Could not update transaction.' });
    }
};

exports.deleteTransaction = async (req, res) => {
    const { transactionId } = req.query;

    if (!transactionId) {
        return res.status(400).json({ error: 'transactionId parameter is required.' });
    }

    try {
        const deleted = await Transaction.findByIdAndDelete(transactionId);
        if (!deleted) {
            return res.status(404).json({ error: 'Transaction not found.' });
        }
        return res.status(200).json({ message: 'Transaction deleted successfully.', transactionId });
    } catch (error) {
        console.error('Error deleting transaction:', error);
        return res.status(500).json({ error: 'Internal server error. Could not delete transaction.' });
    }
};
