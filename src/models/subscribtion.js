const mongoose = require("mongoose");

const subscriptionSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    companyId: { type: String }, // optional if you need
    customerId: { type: String, required: true },
    subscriptionId: { type: String, required: true },
    priceId: { type: String, required: true },
    type: { type: String, enum: ["monthly", "yearly"], required: true },
    currentReference: { type: String }, // like invoice, etc.
    status: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.Subscription ||
  mongoose.model("Subscription", subscriptionSchema);
