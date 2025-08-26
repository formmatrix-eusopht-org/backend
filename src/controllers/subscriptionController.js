const Subscribtion = require("../models/subscribtion");
const { storeSubscription } = require("../services/subscriptionServices");

module.exports = {
    createSubscription: async (req, res) => {
        try {
            const { email, address, priceId, paymentMethodId } = req.body;

            // 1. Get or create customer
            let customer = await stripe.customers.list({ email, limit: 1 });
            if (customer.data.length > 0) {
                customer = customer.data[0];
            } else {
                customer = await stripe.customers.create({ email, address });
            }

            // 2. Attach payment method
            await stripe.paymentMethods.attach(paymentMethodId, { customer: customer.id });
            await stripe.customers.update(customer.id, {
                invoice_settings: { default_payment_method: paymentMethodId },
            });

            // 3. Create subscription
            const subscription = await stripe.subscriptions.create({
                customer: customer.id,
                items: [
                    {
                        price:
                            priceId === "monthly"
                                ? process.env.MONTHLY_PRICE_ID
                                : process.env.YEARLY_PRICE_ID,
                    },
                ],
                expand: ["latest_invoice.payment_intent"],
            });

            // 4. Save subscription in DB
            const savedSub = await storeSubscription(
                { email, priceId },
                subscription
            );

            res.status(201).json({
                message: "Subscription created successfully",
                subscription: savedSub,
                clientSecret: subscription.latest_invoice.payment_intent.client_secret,
            });
        } catch (err) {
            console.error("❌ Stripe subscription error:", err);
            res.status(500).json({ error: err.message });
        }
    },
    getSubscribtions: async (req, res) => {
        try {
            const subscriptions = await Subscribtion.find().sort({ createdAt: -1 });
            res.json(subscriptions);
        } catch (err) {
            res.status(500).json({ error: err.message });
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