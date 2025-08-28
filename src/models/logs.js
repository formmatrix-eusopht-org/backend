const mongoose = require("mongoose");

const LogSchema = new mongoose.Schema({
  userId: { type: String }, // keep as String since Stripe uses string IDs, not Mongo ObjectIds
  action: { type: String, required: true }, // e.g., "SUBSCRIBE", "RENEW", "CANCEL"
  subscriptionId: { type: String }, // store Stripe subscriptionId
  paymentId: { type: String }, // store Stripe paymentId
  message: String,
  data: { type: mongoose.Schema.Types.Mixed }, // 🔑 full raw object
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.models.Log || mongoose.model("Log", LogSchema);
