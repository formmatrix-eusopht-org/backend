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

                // The subscription object from create already contains current_period_end
                let expirationTimestamp = subscription.current_period_end;

                // If it's missing for some reason, try to retrieve it once more
                if (!expirationTimestamp) {
                    const retrievedSub = await stripe.subscriptions.retrieve(subscription.id);
                    expirationTimestamp = retrievedSub.current_period_end;
                }

                console.log("Subscription ID:", subscription.id);
                console.log("Raw Expiration (seconds):", expirationTimestamp);

                // Stripe timestamps are in SECONDS, JS Date needs MILLISECONDS
                const planExpirationDate = expirationTimestamp
                    ? new Date(expirationTimestamp * 1000)
                    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30-day fallback

                console.log("Converted Expiration:", planExpirationDate);

                await updateUserByFirebaseUid(userId, {
                    customerId: customer.id,
                    subscriptionID: subscription.id,
                    priceId: price_id,
                    plan: priceId === "Monthly Plan" ? "monthly" : priceId === "Yearly Plan" ? "yearly" : "daily",
                    planExpiration: planExpirationDate,
                    subscriptionStatus: subscription.status,
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
            const { subscriptionID } = req.params;

            if (!subscriptionID) {
                return res.status(400).json({ error: "subscriptionID is required" });
            }

            // 1. Retrieve the specific subscription from Stripe to get the customer ID
            const mainSubscription = await stripe.subscriptions.retrieve(subscriptionID);
            const customerId = mainSubscription.customer;

            if (!customerId) {
                return res.status(404).json({ error: "Customer not found for this subscription" });
            }

            // 2. Fetch all subscriptions (active, canceled, etc.) for this customer from Stripe
            const stripeSubscriptions = await stripe.subscriptions.list({
                customer: customerId,
                status: 'all',
                expand: ['data.latest_invoice'],
            });

            // 3. Fetch all invoices (payment history) for this customer from Stripe
            const stripeInvoices = await stripe.invoices.list({
                customer: customerId,
                limit: 50,
            });



            const priceMap = {
                [process.env.DAILY_PRICE_ID]: "5",
                [process.env.MONTHLY_PRICE_ID]: "50",
                [process.env.YEARLY_PRICE_ID]: "500",
            };

            // 4. Format subscriptions for the UI
            const formattedSubscriptions = stripeSubscriptions.data.map(sub => {
                const subItems = sub.items.data;
                const price_id = subItems.length > 0 ? subItems[0].price.id : null;

                return {
                    subscriptionId: sub.id,
                    status: sub.status,
                    currentPeriodStart: sub.current_period_start ? new Date(sub.current_period_start * 1000) : null,
                    currentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end * 1000) : null,
                    priceId: price_id,
                    Price: price_id ? (priceMap[price_id] || "Unknown") : "N/A",
                    planType: price_id === process.env.MONTHLY_PRICE_ID ? "Monthly Plan" :
                        price_id === process.env.YEARLY_PRICE_ID ? "Yearly Plan" :
                            price_id === process.env.DAILY_PRICE_ID ? "Daily Plan" : "Other",
                    cancelAtPeriodEnd: sub.cancel_at_period_end,
                };
            });

            // 5. Format invoices as payments for the UI
            const formattedPayments = stripeInvoices.data.map(invoice => ({
                invoiceId: invoice.id,
                amountPaid: invoice.amount_paid / 100, // Stripe uses cents
                currency: invoice.currency.toUpperCase(),
                status: invoice.status,
                hosted_invoice_url: invoice.hosted_invoice_url,
                invoice_pdf: invoice.invoice_pdf,
                date: invoice.created ? new Date(invoice.created * 1000) : null,
                periodStart: invoice.period_start ? new Date(invoice.period_start * 1000) : null,
                periodEnd: invoice.period_end ? new Date(invoice.period_end * 1000) : null,
            }));

            return res.json({
                subscriptions: formattedSubscriptions, // Array of subscriptions
                payments: formattedPayments,           // Array of invoices/payments
            });

        } catch (err) {
            console.error("Error fetching data from Stripe:", err);
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