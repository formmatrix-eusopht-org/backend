const { v4: uuidv4 } = require('uuid');
const { handleSessionLimit, validateSession, removeSession } = require('../lib/sessionManager');
const connectDB = require('../lib/mongoDB');
const auth = require('../lib/firebaseAdmin');
const ms = require('ms');
const user = require('../models/user');
const { dynamicSendEmail } = require('../utils/emailer');




exports.login = async (req, res) => {

    try {
        const { token } = req.body;
        // console.log("login called")
        if (!token) {
            return res.status(400).json({ success: false, error: 'No token provided' });
        }

        const decodedToken = await auth.verifyIdToken(token);

        const sessionId = uuidv4();
        const userAgent = req.get('User-Agent') || 'unknown';
        const invalidatedSessionIds = await handleSessionLimit(
            decodedToken.uid,
            sessionId,
            userAgent
        );

        const expiresIn = 14 * 24 * 60 * 60 * 1000; // 14 days
        const sessionCookie = await auth.createSessionCookie(token, { expiresIn });
        const userauth = await user.findOne({ firebase_uid: decodedToken.uid });
        // console.log("userauth", userauth)
        const userRole = userauth ? userauth.role : 1;
        const cookieOpts = {
            httpOnly: true,
            secure: true,
            sameSite: 'none',
            maxAge: expiresIn,
            path: '/',
        };

        console.log("login success", decodedToken.uid, sessionId, invalidatedSessionIds)
        res
            .cookie('session', sessionCookie, cookieOpts)
            .cookie('sessionId', sessionId, cookieOpts)
            .json({
                success: true,
                invalidatedSessionIds,
                userData: userauth,
                role: userRole
            });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
};

exports.checkSession = async (req, res) => {

    try {
        const referer = req.get('referer') || '';
        let refererPath = '';
        try {
            refererPath = new URL(referer).pathname;
        } catch { }

        console.log('checkSession called from path:', refererPath);

        const sessionCookie = req.cookies.session;
        const sessionId = req.cookies.sessionId;

        if (!sessionCookie || !sessionId) {
            console.log('No session or sessionId cookie found');
            return res.json({ user: null, path: refererPath });
        }

        let decodedClaims;
        try {
            decodedClaims = await auth.verifySessionCookie(sessionCookie, true);
        } catch (e) {
            console.error('Session verification failed:', e);
            return res.json({ user: null, path: refererPath });
        }

        if (!decodedClaims.uid) {
            console.log('No UID in decoded claims');
            return res.json({ user: null, path: refererPath });
        }

        const isValid = await validateSession(decodedClaims.uid, sessionId);
        if (!isValid) {
            console.log(`Session ${sessionId} is no longer valid`);
            return res.json({ user: null, path: refererPath });
        }
        const obj = { user: decodedClaims, path: refererPath }
        console.log("session", obj)
        return res.json({ user: decodedClaims, path: refererPath });
    } catch (err) {
        console.error('Session check error:', err);
        return res.json({ user: null, path: null });
    }
};
exports.addUser = async (req, res) => {
    try {
        const { name, email, password, trialPeriod = 14, createdBy } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide name, email and password'
            });
        }

        const trialDays = parseInt(trialPeriod);
        if (isNaN(trialDays) || trialDays < 0) {
            return res.status(400).json({
                success: false,
                message: 'Trial period must be a positive number'
            });
        }

        const userRecord = await auth.createUser({
            email,
            password,
            displayName: name,
        });

        // Calculate trial expiration date
        const today = new Date();
        const trialExpires = new Date(today.getTime() + trialDays * 24 * 60 * 60 * 1000);

        // Create user in database with Firebase UID
        const newUser = await user.create({
            firebase_uid: userRecord.uid,
            name,
            email,
            createdBy,
            role: 1,
            trialPeriod: trialDays,
            trialExpires
        });

        await auth.setCustomUserClaims(userRecord.uid, {
            role: 1,
            trialExpires: trialExpires.getTime()
        });
        let url = process.env.CLIENT_URL + "/"
        await dynamicSendEmail(email, "user_account_creation", name, url)
        res.status(201).json({
            success: true,
            message: 'User created successfully',
            data: {
                id: newUser._id,
                name: newUser.name,
                email: newUser.email,
                createdBy,
                role: newUser.role,
                trialPeriod: newUser.trialPeriod,
                trialExpires: newUser.trialExpires
            }
        });
    } catch (error) {
        console.error('Error adding user:', error);

        // Handle Firebase specific errors
        if (error.code) {
            switch (error.code) {
                case 'auth/email-already-exists':
                    return res.status(400).json({
                        success: false,
                        message: 'Email already exists'
                    });
                case 'auth/invalid-email':
                    return res.status(400).json({
                        success: false,
                        message: 'Invalid email format'
                    });
                case 'auth/invalid-password':
                    return res.status(400).json({
                        success: false,
                        message: 'Password should be at least 6 characters'
                    });
                default:
                    return res.status(500).json({
                        success: false,
                        message: 'Error creating user',
                        error: error.message
                    });
            }
        }

        res.status(500).json({
            success: false,
            message: 'Error creating user',
            error: error.message
        });
    }
};


exports.logout = async (req, res) => {
    console.log("logout called")
    try {
        const sessionId = req.cookies.sessionId;
        const sessionCookie = req.cookies.session;

        if (sessionCookie && sessionId) {
            await removeSession(sessionId);
            console.log(`Removed session ${sessionId}`);
        }

        const cookieOpts = {
            httpOnly: true,
            secure: true,
            sameSite: 'none',
            path: '/',
            maxAge: 0,
        };

        res
            .cookie('session', '', cookieOpts)
            .cookie('sessionId', '', cookieOpts)
            .json({ success: true });

    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
};
exports.getUsers = async (req, res) => {
    try {
        const { uid } = req.body; // take uid from request body

        if (!uid) {
            return res.status(400).json({ success: false, error: 'uid is required' });
        }

        const users = await user.find({ createdBy: uid }); // filter here
        res.json(users);

    } catch (error) {
        console.error('user error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
};

