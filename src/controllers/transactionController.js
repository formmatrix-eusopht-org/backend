
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

    try {
        let pricing = await transactionPrices.findOne({ user_id: userId });
        if (!pricing) {
            pricing = await transactionPrices.create({
                user_id: userId,
                simpleTransfer: parseFloat(process.env.SIMPLE_TRANSFER) || 5,
                multipleTransfer: parseFloat(process.env.MULTIPLE_TRANSFER) || 5,
                duplicateTitle: parseFloat(process.env.DUPLICATE_TITLE) || 5,
                duplicateRegistration: parseFloat(process.env.DUPLICATE_REGISTRATION) || 5,
                duplicateStickers: parseFloat(process.env.DUPLICATE_STICKERS) || 5,
                duplicatePlatesAndStickers: parseFloat(process.env.DUPLICATE_PLATES_AND_STICKERS) || 5,
                addLienholder: parseFloat(process.env.ADD_LIENHOLDER) || 5,
                removeLienholder: parseFloat(process.env.REMOVE_LIENHOLDER) || 5,
                nameChange: parseFloat(process.env.NAME_CHANGE) || 5,
                changeOfAddress: parseFloat(process.env.CHANGE_OF_ADDRESS) || 5,
                filingPNO: parseFloat(process.env.FILING_PNO) || 5,
                restorePNOVehicle: parseFloat(process.env.RESTORE_PNO_VEHICLE) || 5,
                certificateOfNonOperation: parseFloat(process.env.CERTIFICATE_OF_NON_OPERATION) || 5,
                personalizedPlates: parseFloat(process.env.PERSONALIZED_PLATES) || 5,
                disabledPersonPlacardsPlates: parseFloat(process.env.DISABLED_PERSON_PLACARDS_PLATES) || 5,
                commercialVehicle: parseFloat(process.env.COMMERCIAL_VEHICLE) || 5,
                salvage: parseFloat(process.env.SALVAGE) || 5,
            });
        }

        const normalizedType = aliasMap[transactionType] || transactionType;


        const key = normalizedType
            .replace(/[^a-zA-Z0-9 ]/g, '')
            .replace(/\s+/g, ' ')
            .trim()
            .split(' ')
            .map((word, i) => i === 0 ? word.toLowerCase() : word[0].toUpperCase() + word.slice(1))
            .join('');

        const price = pricing[key];
        console.log('Transaction price:', price);
        if (price === undefined) {
            return res.status(400).json({ error: `Transaction type '${transactionType}' not found in user's pricing.` });
        }



        const transaction = await Transaction.create({ userId, transactionType, formData, transactionPrice: price, });
        return res.status(200).json({
            message: 'Transaction saved successfully!',
            transactionId: transaction._id,
        });
    } catch (error) {
        console.error('Error saving transaction:', error);
        return res.status(500).json({ error: 'Internal server error. Could not save transaction.' });
    }
};

/**
 * Fetch transactions by userId or transactionId
 */

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
