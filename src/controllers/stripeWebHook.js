const Stripe = require("stripe");
const { updateUserByFirebaseUid } = require("../services/userServices");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

module.exports = {
    stripeWebhook: async (req, res) => {
        const sig = req.headers["stripe-signature"];
        let event;

        try {
            event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
        } catch (err) {
            console.error("⚠️ Webhook signature verification failed", err.message);
            return res.status(400).send(`Webhook Error: ${err.message}`);
        }

        const type = event.type;
        const object = event.data.object;
        console.log("Webhook received:", type);

        try {
            switch (type) {
                // ✅ Payment succeeded (initial + renewals)
                case "invoice.payment_succeeded": {
                    const invoice = object;
                    const subscriptionId = invoice.subscription;

                    if (!subscriptionId) break;

                    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
                    const userId = subscription.metadata?.user_id;

                    if (userId) {
                        const line = invoice.lines?.data?.[0];
                        const linePeriodEnd = line?.period?.end ? new Date(line.period.end * 1000) : null;

                        await updateUserByFirebaseUid(userId, {
                            subscriptionStatus: subscription.status,
                            planExpiration: linePeriodEnd,
                        });
                        console.log("✅ User table updated (Success):", userId);
                    }
                    break;
                }

                // ⚠️ Payment failed
                case "invoice.payment_failed": {
                    const invoice = object;
                    const subscriptionId = invoice.subscription;
                    if (!subscriptionId) break;

                    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
                    const userId = subscription.metadata?.user_id;

                    if (userId) {
                        await updateUserByFirebaseUid(userId, {
                            subscriptionStatus: subscription.status,
                        });
                        console.log("⚠️ User table updated (Failed):", userId);
                    }
                    break;
                }

                // 🔄 Subscription updated/canceled
                case "customer.subscription.updated":
                case "customer.subscription.deleted": {
                    const subscription = object;
                    const userId = subscription.metadata?.user_id;

                    if (userId) {
                        const expirationDate = subscription.current_period_end
                            ? new Date(subscription.current_period_end * 1000)
                            : null;

                        await updateUserByFirebaseUid(userId, {
                            subscriptionStatus: subscription.status,
                            planExpiration: expirationDate,
                        });
                        console.log("🔄 User table updated (Updated/Deleted):", userId);
                    }
                    break;
                }

                default:
                    console.log(`ℹ️ Event received: ${type}`);
            }
        } catch (error) {
            console.error("🚨 Error handling webhook:", type, error);
        }

        res.sendStatus(200);
    },
};
