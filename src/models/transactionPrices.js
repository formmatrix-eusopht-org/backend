const mongoose = require('mongoose');

const transactionPricesSchema = new mongoose.Schema({
    user_id: { type: String, required: true },

    simpleTransfer: { type: Number, default: 5 },
    multipleTransfer: { type: Number, default: 5 },
    duplicateTitle: { type: Number, default: 5 },
    duplicateRegistration: { type: Number, default: 5 },
    duplicateStickers: { type: Number, default: 5 },
    duplicatePlatesAndStickers: { type: Number, default: 5 },
    addLienholder: { type: Number, default: 5 },
    removeLienholder: { type: Number, default: 5 },
    nameChange: { type: Number, default: 5 },
    changeOfAddress: { type: Number, default: 5 },
    filingPNO: { type: Number, default: 5 },
    restorePNOVehicle: { type: Number, default: 5 },
    certificateOfNonOperation: { type: Number, default: 5 },
    personalizedPlates: { type: Number, default: 5 },
    disabledPersonPlacardsPlates: { type: Number, default: 5 },
    commercialVehicle: { type: Number, default: 5 },
    salvage: { type: Number, default: 5 }
});

module.exports = mongoose.model('TransactionPrices', transactionPricesSchema);
