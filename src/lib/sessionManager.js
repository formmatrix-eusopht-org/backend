// src/lib/sessionmanager.js
const Session = require('../models/session');

async function handleSessionLimit(userId, newSessionId, deviceInfo) {
  const active = await Session.find({ userId }).sort({ createdAt: 1 });
  const invalidated = [];

  if (!active.find(s => s.sessionId === newSessionId)) {
    // if (active.length >= 2) {
    //   const oldest = active[0];
    //   await Session.deleteOne({ sessionId: oldest.sessionId });
    //   invalidated.push(oldest.sessionId);
    //   console.log(`Invalidated session ${oldest.sessionId}`);
    // }
    await Session.create({ userId, sessionId: newSessionId, deviceInfo });
    console.log(`Created session ${newSessionId}`);
  }

  return invalidated;
}

async function validateSession(userId, sessionId) {
  if (!userId || !sessionId) return false;
  const found = await Session.findOne({ userId, sessionId });
  const ok = Boolean(found);
  if (!ok) console.log(`Session ${sessionId} for ${userId} not found`);
  return ok;
}


async function removeSession(sessionId) {
  if (!sessionId) return;
  const { deletedCount } = await Session.deleteOne({ sessionId });
  console.log(`Removed session ${sessionId}, deletedCount=${deletedCount}`);
}

module.exports = {
  handleSessionLimit,
  validateSession,
  removeSession,
};
