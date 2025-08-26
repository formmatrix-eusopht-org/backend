const mongoose = require("mongoose");

const PaymentSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    payment_method_id: { type: String, required: false },
    company_id: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: false },
    brand: { type: String },
    card_number: { type: String },
    expire_at: { type: String },
    cvc: { type: String },
    name: { type: String },
    address: { type: String },
    city: { type: String },
    country: { type: String },
    contact: { type: String },
    status: { type: Number, default: 1 },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

module.exports = mongoose.model("Payment", PaymentSchema);
