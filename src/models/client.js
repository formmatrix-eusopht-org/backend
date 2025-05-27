const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
    user_id: { type: String, required: true },

    firstName1: { type: String },
    middleName1: { type: String },
    lastName1: { type: String },
    licenseNumber1: { type: String },
    and1: { type: Boolean, default: false },
    or1: { type: Boolean, default: false },

    firstName2: { type: String },
    middleName2: { type: String },
    lastName2: { type: String },
    licenseNumber2: { type: String },
    and2: { type: Boolean, default: false },
    or2: { type: Boolean, default: false },

    firstName3: { type: String },
    middleName3: { type: String },
    lastName3: { type: String },
    licenseNumber3: { type: String },

    residentualAddress: { type: String },
    residentualAptSpace: { type: String },
    residentualCity: { type: String },
    residentualState: { type: String },
    residentualZipCode: { type: String },

    mailingAddress: { type: String },
    mailingPoBox: { type: String },
    mailingCity: { type: String },
    mailingState: { type: String },
    mailingZipCode: { type: String },

    vehicleVinNumber: { type: String },
    vehicleLicensePlateNumber: { type: String },
    vehicleMake: { type: String },
    vehicleSaleMonth: { type: String },
    vehicleSaleDay: { type: String },
    vehicleSaleYear: { type: String },
    vehiclePurchasePrice: { type: String },

    gift: { type: Boolean, default: false },
    trade: { type: Boolean, default: false },
    transactionType: { type: String },

    timeCreated: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Client', clientSchema);
