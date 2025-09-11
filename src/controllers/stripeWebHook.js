const Stripe = require("stripe");
const { storeSubscription, updateSubscription } = require("../services/subscriptionServices");
const { storePayment } = require("../services/paymentServices");
const { storeLog } = require("../services/logServices");
const { dynamicSendEmail } = require("../utils/emailer");
const { updateUserByFirebaseUid } = require("../services/userServices");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET_TEST_KEY;

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

        try {
            switch (type) {
                // 🆕 New subscription created
                case "customer.subscription.created": {
                    const sub = object;

                    const invoice = sub.latest_invoice
                        ? await stripe.invoices.retrieve(sub.latest_invoice, { expand: ["lines.data.period"] })
                        : null;

                    const line = invoice?.lines?.data?.[0];
                    const linePeriodStart = line?.period?.start;
                    const linePeriodEnd = line?.period?.end;

                    await storeSubscription({
                        userId: sub.metadata.user_id,
                        name: sub.metadata.name,
                        customerId: sub.customer,
                        subscriptionId: sub.id,
                        priceId: sub.items.data[0].price.id,
                        planType: sub.metadata.plan_type,
                        currentReference: sub.latest_invoice,
                        status: "inactive",
                        currentPeriodStart: linePeriodStart
                            ? new Date(linePeriodStart * 1000)
                            : new Date(),
                        currentPeriodEnd: linePeriodEnd
                            ? new Date(linePeriodEnd * 1000)
                            : new Date(),
                    });


                    await storeLog({
                        userId: sub.metadata.user_id,
                        action: "SUBSCRIBE",
                        subscriptionId: sub.id,
                        message: "New subscription created",
                        data: sub,
                    });

                    console.log("🆕 Subscription created:", sub.id);
                    break;
                }
                // ✅ User finished Checkout
                // case "checkout.session.completed": {
                //     const session = object;
                //     const subscriptionId = session.subscription;
                //     const customerId = session.customer;

                //     // Save subscription details if you want immediate logging
                //     await storeLog({
                //         userId: session.metadata?.user_id,
                //         action: "CHECKOUT_COMPLETED",
                //         subscriptionId,
                //         message: "Checkout session completed",
                //         data: session,
                //     });

                //     console.log("💰 Checkout completed for customer:", customerId);
                //     break;
                // }

                // ✅ Payment succeeded (covers initial + renewals)
                case "invoice.payment_succeeded": {
                    const invoice = object;

                    let subscriptionId = invoice.subscription || invoice.parent?.subscription_details?.subscription || null;
                    let userId = null;
                    let plan = null;

                    // Try to get subscription metadata if subscription exists
                    if (subscriptionId) {
                        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
                        userId = subscription.metadata?.user_id ?? null;
                        plan = subscription.metadata?.plan_type ?? null;
                    }

                    // Fallback to invoice metadata
                    if (!userId) {
                        userId = invoice.metadata?.user_id ?? null;
                    }

                    // Fallback to customer metadata
                    if (!userId) {
                        const customer = await stripe.customers.retrieve(invoice.customer);
                        userId = customer.metadata?.user_id ?? invoice.customer ?? null;
                    }

                    const line = invoice.lines?.data?.[0];
                    const linePeriodStart = line?.period?.start ? new Date(line.period.start * 1000) : null;
                    const linePeriodEnd = line?.period?.end ? new Date(line.period.end * 1000) : null;

                    // Store payment
                    await storePayment({
                        userId,
                        customerId: invoice.customer,
                        subscriptionId,
                        invoiceId: invoice.id,
                        paymentIntentId: invoice.payment_intent,
                        amountPaid: invoice.amount_paid,
                        currency: invoice.currency,
                        status: invoice.status,
                        periodStart: linePeriodStart,
                        periodEnd: linePeriodEnd,
                    });

                    // Update subscription status in DB
                    if (subscriptionId) {
                        await updateSubscription(subscriptionId, { status: "active" });
                    }
                    let user;
                    // Update user subscription info
                    if (userId) {
                        user = await updateUserByFirebaseUid(userId, {
                            subscriptionID: subscriptionId,
                            planExpiration: linePeriodEnd,
                            plan,
                        });
                    } else {
                        console.warn("⚠️ Could not resolve userId for invoice", invoice.id);
                    }

                    // Log success
                    await storeLog({
                        userId,
                        action: "PAYMENT_SUCCEEDED",
                        subscriptionId,
                        message: "Invoice paid successfully",
                        data: invoice,
                    });
                    let url = process.env.CLIENT_URL + "/subscriptions";
                    // await dynamicSendEmail(user.email, "user_subscription", user.name, url);
                    console.log("✅ Invoice payment succeeded:", invoice.id, "for user:", userId);
                    break;
                }

                case "invoice.payment_failed": {
                    const invoice = object;

                    // Fetch customer for fallback info
                    const customer = await stripe.customers.retrieve(invoice.customer);
                    const userId = invoice.metadata?.user_id || customer.metadata?.user_id;
                    const email = invoice.metadata?.email || customer.email;

                    // Don’t hard set inactive yet – let Stripe retry
                    await updateSubscription(invoice.subscription, { status: "past_due" });

                    await storeLog({
                        userId,
                        action: "PAYMENT_FAILED",
                        subscriptionId: invoice.subscription,
                        message: "Invoice payment failed (Stripe may retry)",
                        data: invoice,
                    });

                    // Notify user to update payment method
                    // if (email) {
                    //     await dynamicSendEmail(email, "payment_failed", customer.name || "", "/subscriptions");
                    // }

                    console.log("⚠️ Invoice payment failed:", invoice.id, "for user:", userId);
                    break;
                }


                // 🔄 Subscription updated (upgrade/downgrade/cancel at period end)
                case "customer.subscription.updated": {
                    const sub = object;

                    if (sub.cancel_at_period_end) {
                        // await updateUserByFirebaseUid(sub.metadata.user_id, { subscriptionID: null });
                        await updateSubscription(sub.id, { status: "inactive" });

                        await storeLog({
                            userId: sub.metadata.user_id,
                            action: "SUBSCRIPTION_CANCELED",
                            subscriptionId: sub.id,
                            message: "User set subscription to cancel at period end",
                            data: sub,
                        });

                        console.log("❌ Subscription set to cancel at period end:", sub.id);
                    } 
                    // else {
                    //     // Handle plan change
                    //     await updateSubscription(sub.id, { status: sub.status });
                    //     await storeLog({
                    //         userId: sub.metadata.user_id,
                    //         action: "SUBSCRIPTION_UPDATED",
                    //         subscriptionId: sub.id,
                    //         message: "Subscription updated",
                    //         data: sub,
                    //     });

                    //     console.log("🔄 Subscription updated:", sub.id);
                    // }
                    break;
                }

                // ❌ Subscription deleted
                // case "customer.subscription.deleted": {
                //     const sub = object;

                //     // await updateUserByFirebaseUid(sub.metadata.user_id, { subscriptionID: null });
                //     // await updateSubscription(sub.id, { status: "canceled" });

                //     // await storeLog({
                //     //     userId: sub.metadata.user_id,
                //     //     action: "SUBSCRIPTION_DELETED",
                //     //     subscriptionId: sub.id,
                //     //     message: "Subscription deleted",
                //     //     data: sub,
                //     // });

                //     console.log("❌ Subscription deleted:", sub.id);
                //     break;
                // }

                // ⏳ Trial ending soon
                // case "customer.subscription.trial_will_end": {
                //     const sub = object;

                //     // // Optional: send email
                //     // // await dynamicSendEmail(sub.metadata.email, "trial_will_end", sub.metadata.name, "");

                //     await storeLog({
                //         userId: sub.metadata.user_id,
                //         action: "TRIAL_ENDING",
                //         subscriptionId: sub.id,
                //         message: "Trial ending soon",
                //         data: sub,
                //     });
                //     await dynamicSendEmail(sub.metadata.email, "trial_will_end", sub.metadata.name, "/");

                //     console.log("⏳ Trial ending soon:", sub.id);
                //     break;
                // }

                // Everything else → just log
                // default:
                //     console.log(`ℹ️ Event received: ${type}`, object.id);
            }
        } catch (error) {
            console.error("🚨 Error handling webhook:", type, error);
        }

        // Always acknowledge
        res.sendStatus(200);
    },
};
