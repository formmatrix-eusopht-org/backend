const { v4: uuidv4 } = require('uuid');
const { handleSessionLimit, validateSession, removeSession } = require('../lib/sessionManager');
const connectDB = require('../lib/mongoDB');
const auth = require('../lib/firebaseAdmin');
const user = require('../models/user');
const { dynamicSendEmail } = require('../utils/emailer');
const { getUserByfirebaseUid } = require('../services/userServices');

// LOGIN
exports.login = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ success: false, error: 'No token provided' });

    const decodedToken = await auth.verifyIdToken(token);

    // Check user active status from DB
    const userauth = await user.findOne({ firebase_uid: decodedToken.uid });

    if (userauth && userauth.activeStatus === false) {
      return res.status(403).json({ success: false, error: 'active status is disable please contact admin' });
    }

    const sessionId = uuidv4();
    const userAgent = req.get('User-Agent') || 'unknown';
    const invalidatedSessionIds = await handleSessionLimit(decodedToken.uid, sessionId, userAgent);

    const expiresIn = 14 * 24 * 60 * 60 * 1000; // 14 days
    const sessionCookie = await auth.createSessionCookie(token, { expiresIn });

    const cookieOpts = { httpOnly: true, secure: true, sameSite: 'none', maxAge: expiresIn, path: '/' };

    const userDataISO = userauth
      ? {
        ...userauth.toObject(),
        planExpiration: userauth.planExpiration ? userauth.planExpiration.toISOString() : null
      }
      : null;

    res
      .cookie('session', sessionCookie, cookieOpts)
      .cookie('sessionId', sessionId, cookieOpts)
      .json({ success: true, invalidatedSessionIds, userData: userDataISO });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// CHECK SESSION
exports.checkSession = async (req, res) => {
  try {
    const referer = req.get('referer') || '';
    let refererPath = '';
    try { refererPath = new URL(referer).pathname; } catch { }

    const sessionCookie = req.cookies.session;
    const sessionId = req.cookies.sessionId;

    if (!sessionCookie || !sessionId) return res.json({ user: null, path: refererPath });

    let decodedClaims;
    try { decodedClaims = await auth.verifySessionCookie(sessionCookie, true); }
    catch { return res.json({ user: null, path: refererPath }); }

    if (!decodedClaims.uid) return res.json({ user: null, path: refererPath });

    const isValid = await validateSession(decodedClaims.uid, sessionId);
    if (!isValid) return res.json({ user: null, path: refererPath });

    const userDataFrommongo = await getUserByfirebaseUid(decodedClaims.uid);
    const userDataISO = userDataFrommongo
      ? { ...userDataFrommongo.toObject(), planExpiration: userDataFrommongo.planExpiration.toISOString() }
      : null;

    return res.json({ user: decodedClaims, path: refererPath, userData: userDataISO });
  } catch (err) {
    console.error('Session check error:', err);
    return res.json({ user: null, path: null });
  }
};

// ADD USER
exports.addUser = async (req, res) => {
  try {
    const { name, email, password, trialPeriod = 14, createdBy } = req.body;

    if (!name || !email || !password)
      return res.status(400).json({ success: false, message: 'Please provide name, email and password' });

    const trialDays = parseInt(trialPeriod);
    if (isNaN(trialDays) || trialDays < 0)
      return res.status(400).json({ success: false, message: 'Trial period must be a positive number' });

    const userRecord = await auth.createUser({ email, password, displayName: name });

    const today = new Date();
    const planExpiration = new Date(today.getTime() + trialDays * 24 * 60 * 60 * 1000);

    const newUser = await user.create({
      firebase_uid: userRecord.uid,
      name,
      email,
      createdBy,
      plan: "trial",
      role: 1,
      trialPeriod: trialDays,
      planExpiration
    });

    await auth.setCustomUserClaims(userRecord.uid, { role: 1, planExpires: planExpiration.getTime() });

    // const url = process.env.CLIENT_URL + "/";
    // await dynamicSendEmail(email, "user_account_creation", name, url);

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: { ...newUser.toObject(), planExpiration: planExpiration.toISOString() }
    });
  } catch (error) {

    // Handle Firebase duplicate email error properly
    if (error.code === "auth/email-already-exists") {
      return res.status(400).json({
        success: false,
        message: "This email is already registered. Please use another email.",
      });
    }

    console.error('Error adding user:', error);
    res.status(500).json({ success: false, message: 'Error creating user', error: error.message });
  }
};

// LOGOUT
exports.logout = async (req, res) => {
  try {
    const sessionId = req.cookies.sessionId;
    const sessionCookie = req.cookies.session;

    if (sessionCookie && sessionId) await removeSession(sessionId);

    const cookieOpts = { httpOnly: true, secure: true, sameSite: 'none', path: '/', maxAge: 0 };
    res.cookie('session', '', cookieOpts).cookie('sessionId', '', cookieOpts).json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// GET USERS
exports.getUsers = async (req, res) => {
  try {
    const { uid } = req.body;
    if (!uid) return res.status(400).json({ success: false, error: 'uid is required' });

    const usersList = await user.find({ createdBy: uid });
    const usersISO = usersList.map(u => ({
      ...u.toObject(),
      planExpiration: u.planExpiration ? u.planExpiration.toISOString() : null
    }));

    res.json(usersISO);
  } catch (error) {
    console.error('user error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
