const connectDB = require("../lib/mongoDB");
const Log = require("../models/logs");

module.exports = {
  storeLog: async (data) => {
    try {
      await connectDB();
      const log = new Log(data);
      await log.save();
      return log;
    } catch (err) {
      console.error("❌ Error saving log:", err);
      throw err;
    }
  },

  getLogs: async (filter = {}) => {
    await connectDB();
    return await Log.find(filter).sort({ createdAt: -1 });
  },

  getLogById: async (id) => {
    await connectDB();
    return await Log.findById(id);
  },

  deleteLog: async (id) => {
    await connectDB();
    return await Log.findByIdAndDelete(id);
  },
};
