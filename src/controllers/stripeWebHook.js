const Stripe = require("stripe");
const { storeSubscription } = require("../services/subscriptionServices");
const { storePayment } = require("../services/paymentServices");
const { storeLog } = require("../services/logServices");
const { dynamicSendEmail } = require("../utils/emailer");
const { updateUserByFirebaseUid } = require("../services/userServices");
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET_TEST_KEY;

// Webhook route
module.exports = {
    stripeWebhook: async (req, res) => {
        const sig = req.headers["stripe-signature"];
        let event;

        console.log("\n--- 🚀 Incoming Stripe webhook ---");

        try {
            event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
        } catch (err) {
            return res.status(400).send(`Webhook Error: ${err.message}`);
        }

        const data = event.data.object;

        switch (event.type) {
            // 🔑 Checkout completed
            case "checkout.session.completed":
                console.log("💰 Checkout completed:", data.id);
                // TODO: Save subscription/customer to DB
                break;

            // 💳 Payment succeeded (invoice)
            case "invoice.payment_succeeded":
                console.log("✅ Invoice payment succeeded:", data.id);
                // TODO: Mark subscription active in DB
                break;

            // ❌ Payment failed
            case "invoice.payment_failed":
                console.log("⚠️ Invoice payment failed:", data.id);
                // TODO: Notify user, mark subscription past_due in DB
                break;

            // 📄 Invoice paid manually
            case "invoice.paid":
                console.log("📄 Invoice paid:", data.id);
                break;

            // 🆕 Subscription created
            case "customer.subscription.created": {
                const sub = event.data.object;

                // Retrieve invoice
                const invoice = await stripe.invoices.retrieve(sub.latest_invoice, {
                    expand: ["lines.data.period"], // ensure line periods are included
                });

                // ✅ Get the first line before using it
                const line = invoice.lines?.data?.[0];
                const linePeriodStart = line?.period?.start;
                const linePeriodEnd = line?.period?.end;

                // Save subscription in DB
                await storeSubscription({
                    userId: sub.metadata.user_id,
                    name: sub.metadata.name,
                    customerId: sub.customer,
                    subscriptionId: sub.id,
                    priceId: sub.items.data[0].price.id,
                    planType: sub.metadata.plan_type,
                    currentReference: sub.latest_invoice,
                    status: sub.status,
                    currentPeriodStart: linePeriodStart
                        ? new Date(linePeriodStart * 1000)
                        : new Date(invoice.created * 1000),
                    currentPeriodEnd: linePeriodEnd
                        ? new Date(linePeriodEnd * 1000)
                        : new Date(invoice.created * 1000),
                });

                await storePayment({
                    userId: sub.metadata.user_id,
                    customerId: sub.customer,
                    subscriptionId: sub.id,
                    invoiceId: invoice.id,
                    paymentIntentId: invoice.payment_intent,
                    amountPaid: invoice.amount_paid,
                    currency: invoice.currency,
                    status: invoice.status,
                    periodStart: linePeriodStart
                        ? new Date(linePeriodStart * 1000)
                        : new Date(invoice.created * 1000),
                    periodEnd: linePeriodEnd
                        ? new Date(linePeriodEnd * 1000)
                        : new Date(invoice.created * 1000),
                });
                await storeLog({
                    userId: sub.metadata.user_id,
                    action: "SUBSCRIBE",
                    subscriptionId: sub.id,
                    message: "New subscription created",
                    data: sub, // full Stripe subscription object
                });
                await updateUserByFirebaseUid(sub.metadata.user_id, { subscriptionID: sub.id });
                await dynamicSendEmail(sub.metadata.email, "user_subscription", sub.metadata.name, "");

                break;
            }

            case "customer.subscription.updated": {
                const sub = event.data.object;

                console.log("♻️ Subscription updated:", sub.id);

                // If cancel_at_period_end is false → subscription is still active
                if (!sub.cancel_at_period_end) {
                    console.log("✅ User chose to continue subscription");

                    // Retrieve invoice to get billing period dates
                    let invoice = null;
                    try {
                        invoice = await stripe.invoices.retrieve(sub.latest_invoice, {
                            expand: ["lines.data.period"],
                        });
                    } catch (err) {
                        console.warn("⚠️ Could not fetch invoice:", err.message);
                    }

                    const line = invoice?.lines?.data?.[0];
                    const linePeriodStart = line?.period?.start;
                    const linePeriodEnd = line?.period?.end;

                    // Save or update subscription in DB
                    await storeSubscription({
                        userId: sub.metadata.user_id,
                        name: sub.metadata.name,
                        customerId: sub.customer,
                        subscriptionId: sub.id,
                        priceId: sub.items.data[0].price.id,
                        planType: sub.metadata.plan_type,
                        currentReference: sub.latest_invoice,
                        status: sub.status,
                        currentPeriodStart: linePeriodStart
                            ? new Date(linePeriodStart * 1000)
                            : new Date(),
                        currentPeriodEnd: linePeriodEnd
                            ? new Date(linePeriodEnd * 1000)
                            : new Date(),
                    });

                    if (invoice) {
                        await storePayment({
                            userId: sub.metadata.user_id,
                            customerId: sub.customer,
                            subscriptionId: sub.id,
                            invoiceId: invoice.id,
                            paymentIntentId: invoice.payment_intent,
                            amountPaid: invoice.amount_paid,
                            currency: invoice.currency,
                            status: invoice.status,
                            periodStart: linePeriodStart
                                ? new Date(linePeriodStart * 1000)
                                : new Date(),
                            periodEnd: linePeriodEnd
                                ? new Date(linePeriodEnd * 1000)
                                : new Date(),
                        });
                    }

                    await storeLog({
                        userId: sub.metadata.user_id,
                        action: "SUBSCRIBE_CONTINUED",
                        subscriptionId: sub.id,
                        message: "User continued subscription (cancel_at_period_end = false)",
                        data: sub,
                    });
                    await updateUser(sub.metadata.user_id, { subscribtionID: sub.id });
                    await dynamicSendEmail(
                        sub.metadata.email,
                        "user_subscription_continued",
                        sub.metadata.name,
                        ""
                    );
                } else {
                    console.log("❌ User set subscription to cancel at period end");
                    // Optional: update DB status or log this
                    await storeLog({
                        userId: sub.metadata.user_id,
                        action: "SUBSCRIPTION_SET_TO_CANCEL",
                        subscriptionId: sub.id,
                        message: "User set cancel_at_period_end = true",
                        data: sub,
                    });
                }

                break;
            }


            // ❌ Subscription canceled
            case "customer.subscription.deleted":
                console.log("❌ Subscription canceled:", data.id);
                // TODO: Mark as canceled in DB
                break;

            // ⏳ Trial ending soon
            case "customer.subscription.trial_will_end":
                console.log("⏳ Trial ending soon:", data.id);
                // TODO: Send reminder email
                break;

            // ------------------------------
            // Less important, log only
            // ------------------------------
            case "payment_intent.succeeded":
            case "payment_intent.created":
            case "charge.succeeded":
            case "customer.updated":
            case "payment_method.attached":
            case "invoice.created":
            case "invoice.finalized":
                console.log(`ℹ️ Event received: ${event.type}`, data.id);
                break;

            default:
                console.log(`⚠️ Unhandled event type: ${event.type}`);
        }

        // ✅ Always send 200 so Stripe doesn’t retry
        res.sendStatus(200);
    },
};
