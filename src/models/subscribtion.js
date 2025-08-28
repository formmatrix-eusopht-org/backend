// models/Subscription.js
const mongoose = require("mongoose");

const SubscriptionSchema = new mongoose.Schema({
  userId: { type: String, ref: "users", required: true },
  customerId: String,
  subscriptionId: String,
  priceId: String,
  planType: String,
  status: String,
  currentPeriodStart: Date,
  currentPeriodEnd: Date,
  createdAt: { type: Date, default: Date.now },
});

module.exports =
  mongoose.models.Subscription ||
  mongoose.model("Subscription", SubscriptionSchema);
