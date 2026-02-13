const connectDB = require("../lib/mongoDB");
const Subscription = require("../models/subscribtion");

module.exports = {
    // services/subscriptionServices.js
    storeSubscription: async (data) => {
        try {
            const subscription = new Subscription({
                userId: data.userId,
                customerId: data.customerId,
                subscriptionId: data.subscriptionId,
                priceId: data.priceId,
                planType: data.planType,
                status: data.status,
                currentPeriodStart: data.currentPeriodStart,
                currentPeriodEnd: data.currentPeriodEnd,
            });

            return await subscription.save();
        } catch (err) {
            console.error("❌ Error saving subscription:", err);
            throw err;
        }
    },

    // Get subscription by ID
    getSubscriptionById: async (id) => {
        await connectDB();
        return Subscription.findById(id);
    },

    getSubscriptionBySubscribtionId: async (id) => {
        await connectDB();
        return await Subscription.find({ subscriptionId: id });
    },

    // Get subscription by Stripe subscriptionId
    getSubscriptionByStripeId: async (subscriptionId) => {
        await connectDB();
        return Subscription.findOne({ subscriptionId });
    },

    // Get all subscriptions
    getAllSubscriptions: async () => {
        await connectDB();
        return Subscription.find({});
    },

    // Update subscription (by Stripe subscriptionId)
    updateSubscription: async (subscriptionId, updateData) => {
        await connectDB();
        return Subscription.findOneAndUpdate(
            { subscriptionId },
            { $set: updateData },
            { new: true }
        );
    },

    // Delete subscription
    deleteSubscription: async (subscriptionId) => {
        await connectDB();
        return Subscription.findOneAndDelete({ subscriptionId });
    },
};
