const { storeSubscription } = require("../services/subscriptionServices");
const { default: Stripe } = require("stripe");
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20",
});

exports.stripePayment = async (req, res) => {
  try {
    const { userId, companyId, name, email, address, priceId, paymentMethodId, autoSubscribe } =
      req.body;

    // 1. Get or create customer
    let customer = await stripe.customers.list({ email, limit: 1 });
    if (customer.data.length > 0) {
      customer = customer.data[0];
      await stripe.customers.update(customer.id, {
        name,
        address,
        metadata: { user_id: userId, company_id: companyId || "" },
      });
    } else {
      customer = await stripe.customers.create({
        email,
        name,
        address,
        metadata: { user_id: userId, company_id: companyId || "" },
      });
    }

    // 2. Attach payment method
    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: customer.id,
    });
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
          quantity: 1,
        },
      ],
      expand: ["latest_invoice.payment_intent"],
    });

    // 4. Save subscription in MongoDB
    const savedSub = await storeSubscription(
      userId,
      companyId,
      customer.id,
      subscription.id,
      priceId === "monthly"
        ? process.env.MONTHLY_PRICE_ID
        : process.env.YEARLY_PRICE_ID,
      priceId,
      subscription.latest_invoice?.id || null, // current reference
      autoSubscribe,
    );

    // 5. Send response to frontend
    res.json({
      clientSecret:
        subscription.latest_invoice.payment_intent.client_secret,
      subscriptionId: subscription.id,
      dbRecord: savedSub,
    });
  } catch (err) {
    console.error("Stripe error:", err);
    res.status(500).json({ error: err.message });
  }
};
