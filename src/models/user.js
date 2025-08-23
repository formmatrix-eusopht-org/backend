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
  trialPeriod: {
    type: Number,
    default: 14
  },
  status: {
    type: Number,
    default: 1
  },
  trialExpires: {
    type: Date,
    default: function () {
      const today = new Date();
      return new Date(today.setDate(today.getDate() + this.trialPeriod));
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('User', userSchema);