const connectDB = require("../lib/mongoDB");
const Payment = require("../models/payment");

module.exports = {
    storePayment: async ({
        userId,
        customerId,
        subscriptionId,
        invoiceId,
        paymentIntentId,
        amountPaid,
        currency,
        status,
        periodStart,
        periodEnd,
    }) => {
        try {
            await connectDB();
            const payment = new Payment({
                userId,
                customerId,
                subscriptionId,
                invoiceId,
                paymentIntentId,
                amountPaid,
                currency,
                status,
                periodStart,
                periodEnd,
            });
            await payment.save();
            return payment;
        } catch (err) {
            console.error("❌ Error saving payment:", err);
            throw err;
        }
    },

    getPaymentById: async (id) => {
        await connectDB();
        return Payment.findById(id);
    },

    // Get all payments for a subscription
    getPaymentsBySubscription: async (subscriptionId) => {
        await connectDB();
        return Payment.find({ subscriptionId });
    },

    // Get all payments for a user
    getPaymentsByUser: async (userId) => {
        await connectDB();
        return Payment.find({ userId });
    },

    // Update payment (by invoiceId)
    updatePayment: async (invoiceId, updateData) => {
        await connectDB();
        return Payment.findOneAndUpdate(
            { invoiceId },
            { $set: updateData },
            { new: true }
        );
    },

    // Delete payment
    deletePayment: async (invoiceId) => {
        await connectDB();
        return Payment.findOneAndDelete({ invoiceId });
    },
};
