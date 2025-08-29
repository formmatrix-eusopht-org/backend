const mongoose = require("mongoose");

const PaymentSchema = new mongoose.Schema({
  userId: { type: String, ref: "users" },
  customerId: { type: String, required: true },
  subscriptionId: { type: String, ref: "Subscription" },

  invoiceId: { type: String },            // Stripe invoice ID
  paymentIntentId: { type: String },      // Stripe PaymentIntent ID

  amountPaid: { type: Number },           // amount paid in cents
  currency: { type: String, default: "usd" },
  status: { type: String },               // invoice/payment status

  periodStart: { type: Date },            // billing cycle start
  periodEnd: { type: Date },              // billing cycle end

  createdAt: { type: Date, default: Date.now },
});

module.exports =
  mongoose.models.Payment || mongoose.model("Payment", PaymentSchema);
