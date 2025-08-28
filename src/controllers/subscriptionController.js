const Subscribtion = require("../models/subscribtion");
const { storeSubscription } = require("../services/subscriptionServices");
const Stripe = require("stripe");
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
            try {// 3. Create subscription
                subscription = await stripe.subscriptions.create({
                    customer: customer.id,
                    items: [
                        {
                            price:
                                priceId === "monthly"
                                    ? process.env.MONTHLY_PRICE_ID
                                    : process.env.YEARLY_PRICE_ID,
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

            // // 4. Save subscription in MongoDB
            // const savedSub = await storeSubscription(
            //     userId,
            //     name,
            //     customer.id,
            //     subscription.id,
            //     priceId === "monthly"
            //         ? process.env.MONTHLY_PRICE_ID
            //         : process.env.YEARLY_PRICE_ID,
            //     priceId,
            //     subscription.latest_invoice?.id || null, // current reference
            //     autoSubscribe,
            // );

            // 5. Send response to frontend
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