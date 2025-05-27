const mongoose = require('mongoose');
const { DB_URI } = process.env;

let isConnected = false;

async function connectDB() {
    try {
        if (isConnected) return;
        await mongoose.connect(DB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        isConnected = true;
        console.log('✅ MongoDB connected');
    }
    catch (error) {
        console.error('❌ MongoDB connection error:', error);
        throw new Error('MongoDB connection failed');
    }
}

module.exports = connectDB;
