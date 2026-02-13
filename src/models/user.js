const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  firebase_uid: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  role: {
    type: Number,
    default: 1
  },
  createdBy: {
    type: String,
    required: true,
  },
  subscriptionID: {
    type: String,
    default: null
  },
  customerId: {
    type: String,
    default: null
  },
  priceId: {
    type: String,
    default: null
  },
  subscriptionStatus: {
    type: String,
    default: false
  },
  activeStatus: {
    type: Boolean,
    default: true
  },
  plan: {
    type: String,
    enum: ["trial", "daily", "monthly", "yearly"],
    default: "trial"
  },
  planExpiration: {
    type: Date,
    default: null
  },
  status: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('User', userSchema);