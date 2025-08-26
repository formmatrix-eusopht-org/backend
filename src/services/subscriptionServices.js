const connectDB = require("../lib/mongoDB");
const Subscription = require("../models/subscribtion");

module.exports = {
    storeSubscription: async (
        userId,
        companyId,
        customerId,
        subscriptionId,
        priceId,
        type,
        currentReference,
        status
    ) => {
        try {
            await connectDB();

            const newSub = new Subscription({
                userId,
                companyId,
                customerId,
                subscriptionId,
                priceId,
                type,
                currentReference,
                status,
            });

            await newSub.save();
            console.log("✅ Subscription saved:", newSub);
            return newSub;
        } catch (err) {
            console.error("❌ Error saving subscription:", err);
            throw err;
        }
    },
    storePaymentDetails: (
        user_id,
        company_id,
        payment_method_id,
        name,
        brand,
        card_number,
        expire_at,
        status
    ) => {
        return new Promise((resolve, reject) => {
            pool.getConnection((err, connection) => {
                if (err) { console.log(e); return }
                connection.query(`INSERT INTO payment_details(user_id, company_id, payment_method_id, name, brand, card_number, expire_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        user_id,
                        company_id,
                        payment_method_id,
                        name,
                        brand,
                        card_number,
                        expire_at,
                        status,
                    ],
                    (error, results, fields) => {
                        connection.release()
                        if (error) {
                            return reject(error);
                        }
                        return resolve(results);
                    })
                // connection.on('error', (err) => {
                //   console.error('Error releasing connection: ' + err.stack);
                // });
            })
        });
    },
};
