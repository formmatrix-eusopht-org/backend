const Subscribtion = require("../models/subscribtion");
const User = require("../models/user");
const { storeSubscription, getSubscriptionBySubscribtionId } = require("../services/subscriptionServices");
const Stripe = require("stripe");
const { updateUserByFirebaseUid, getUserByfirebaseUid } = require("../services/userServices");
const { getPaymentsBySubscription } = require("../services/paymentServices");
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

module.exports = {
    createSubscription: async (req, res) => {
        try {
            const { userId, name, email, address, priceId, paymentMethodId, autoSubscribe } =
                req.body;

            // 1. Get or create customer
            let customer = await stripe.customers.list({ email, limit: 1 });
            if (customer.data.length > 0) {
                customer = customer.data[0];
                await stripe.customers.update(customer.id, {
                    name,
                    address,
                    metadata: { user_id: userId },
                });
            } else {
                customer = await stripe.customers.create({
                    email,
                    name,
                    address,
                    metadata: { user_id: userId },
                });
            }

            // 2. Attach payment method
            await stripe.paymentMethods.attach(paymentMethodId, {
                customer: customer.id,
            });
            await stripe.customers.update(customer.id, {
                invoice_settings: { default_payment_method: paymentMethodId },
            });
            let subscription;
            const price_id = priceId === "Monthly Plan"
                ? process.env.MONTHLY_PRICE_ID
                : priceId === "Yearly Plan" ? process.env.YEARLY_PRICE_ID : process.env.DAILY_PRICE_ID;
            try {// 3. Create subscription
                subscription = await stripe.subscriptions.create({
                    customer: customer.id,
                    items: [
                        {
                            price: price_id,
                            quantity: 1,
                        },
                    ],
                    expand: ["latest_invoice.payment_intent"],
                    cancel_at_period_end: !autoSubscribe,
                    metadata: {
                        user_id: String(userId),
                        name: String(name),
                        plan_type: String(priceId),
                        email: String(email),
                        address_line1: address?.line1 || "",
                        address_city: address?.city || "",
                        address_state: address?.state || "",
                        address_postal: address?.postal_code || "",
                        address_country: address?.country || "",
                    }

                });
            } catch (err) {
                console.error("Stripe error in subdcribtion:", err);
                res.status(500).json({ error: err.message });
                return;
            }

            res.json({
                clientSecret:
                    subscription.latest_invoice,
                subscriptionId: subscription.id
            });
        } catch (err) {
            console.error("Stripe error:", err);
            res.status(500).json({ error: err.message });
        }
    },
    cancelSubscription: async (req, res) => {
        const { firebaseUid } = req.body;

        if (!firebaseUid) {
            return res.status(400).json({ error: "Firebase ID is required" });
        }

        try {
            const user = await getUserByfirebaseUid(firebaseUid);
            if (!user) {
                return res.status(404).json({ error: "User not found" });
            }

            if (!user.subscriptionID) {
                return res.status(400).json({ error: "User has no active subscription" });
            }

            // Retrieve subscription to validate status
            const currentSub = await stripe.subscriptions.retrieve(user.subscriptionID);
            if (!currentSub || currentSub.status === "canceled") {
                return res.status(400).json({ error: "Subscription already canceled or invalid" });
            }

            // Set cancel at period end
            const subscription = await stripe.subscriptions.update(user.subscriptionID, {
                cancel_at_period_end: true,
            });

            res.json({
                message: "Subscription set to cancel at period end",
                subscription,
            });
        } catch (err) {
            console.error("Error canceling subscription:", err);
            res.status(500).json({ error: "Failed to cancel subscription" });
        }
    },

    getSubscriptions: async (req, res) => {
        try {
            const { uid } = req.body; // ✅ not req.params

            // 2. Find subscriptions for that user
            const subscriptions = await Subscribtion.find({ userId: uid })

            res.json(subscriptions);
        } catch (err) {
            console.error("Error fetching subscriptions:", err);
            res.status(500).json({ error: err.message });
        }
    },
    getUserSubscriptionsBySubscriptionsId: async (req, res) => {
        try {
            const { subscriptionID } = req.body;

            if (!subscriptionID) {
                return res.status(400).json({ error: "subscriptionID is required" });
            }

            // Fetch subscription + payments
            const subscriptions = await getSubscriptionBySubscribtionId(subscriptionID);
            const payments = await getPaymentsBySubscription(subscriptionID);

            let formattedSubscription = {};
            if (subscriptions && subscriptions.length > 0) {
                const sub = subscriptions[0].toObject ? subscriptions[0].toObject() : subscriptions[0];

                const stripeSub = await stripe.subscriptions.retrieve(subscriptionID, {
                    expand: ["latest_invoice"],
                });

                // Stripe hosted invoice URL
                const invoice = stripeSub.latest_invoice;
                const invoiceUrl = invoice?.hosted_invoice_url || null;

                // Price mapping
                const priceMap = {
                    [process.env.DAILY_PRICE_ID]: "5",
                    [process.env.MONTHLY_PRICE_ID]: "50",
                    [process.env.YEARLY_PRICE_ID]: "500",
                };

                formattedSubscription = {
                    ...sub,
                    invoiceUrl,
                    Price: priceMap[sub.priceId] || "Unknown", // fallback
                };
            }

            return res.json({
                subscriptions: formattedSubscription,
                payments: payments || [],
            });

        } catch (err) {
            console.error("Error fetching subscriptions:", err);
            return res.status(500).json({ error: err.message });
        }
    },

    getSubscribtionById: async (req, res) => {
        try {
            const subscription = await Subscribtion.findById(req.params.id);
            if (!subscription) return res.status(404).json({ error: "Not found" });
            res.json(subscription);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    updateSubscribtion: async (req, res) => {
        try {
            const subscription = await Subscribtion.findByIdAndUpdate(
                req.params.id,
                req.body,
                { new: true }
            );
            if (!subscription) return res.status(404).json({ error: "Not found" });
            res.json(subscription);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    deleteSubscribtion: async (req, res) => {
        try {
            const subscription = await Subscribtion.findByIdAndDelete(req.params.id);
            if (!subscription) return res.status(404).json({ error: "Not found" });
            res.json({ message: "Subscription deleted" });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
}