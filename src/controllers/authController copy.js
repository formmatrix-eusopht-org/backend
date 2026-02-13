const { v4: uuidv4 } = require("uuid");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { handleSessionLimit, validateSession, removeSession } = require("../lib/sessionManager");
const User = require("../models/user");
const { dynamicSendEmail } = require("../utils/emailer");

const JWT_SECRET = process.env.JWT_SECRET || "changeme"; // put in .env

// ---------------------- LOGIN ----------------------
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: "Email and password required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ success: false, error: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: "Invalid credentials" });
    }

    const sessionId = uuidv4();
    const userAgent = req.get("User-Agent") || "unknown";

    // optional: limit active sessions
    const invalidatedSessionIds = await handleSessionLimit(user._id.toString(), sessionId, userAgent);

    const expiresIn = 14 * 24 * 60 * 60; // 14 days (in seconds)
    const token = jwt.sign({ uid: user._id, role: user.role }, JWT_SECRET, { expiresIn });

    const cookieOpts = {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: expiresIn * 1000,
      path: "/",
    };

    res
      .cookie("session", token, cookieOpts)
      .cookie("sessionId", sessionId, cookieOpts)
      .json({
        success: true,
        invalidatedSessionIds,
        userData: user,
        role: user.role,
      });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
};

// ---------------------- CHECK SESSION ----------------------
exports.checkSession = async (req, res) => {
  try {
    const referer = req.get("referer") || "";
    let refererPath = "";
    try {
      refererPath = new URL(referer).pathname;
    } catch { }

    const token = req.cookies.session;
    const sessionId = req.cookies.sessionId;

    if (!token || !sessionId) {
      return res.json({ user: null, path: refererPath });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      console.error("Invalid JWT:", err);
      return res.json({ user: null, path: refererPath });
    }

    const isValid = await validateSession(decoded.uid, sessionId);
    if (!isValid) {
      return res.json({ user: null, path: refererPath });
    }

    return res.json({ user: decoded, path: refererPath });
  } catch (err) {
    console.error("Session check error:", err);
    return res.json({ user: null, path: null });
  }
};

// ---------------------- REGISTER USER ----------------------
exports.addUser = async (req, res) => {
  try {
    const { name, email, password, trialPeriod = 14, createdBy } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide name, email and password",
      });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ success: false, message: "Email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const trialDays = parseInt(trialPeriod);
    const today = new Date();
    const trialExpires = new Date(today.getTime() + trialDays * 24 * 60 * 60 * 1000);

    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
      createdBy,
      plan: "trial",
      planExpiration: trialExpires,
      role: 1,
      trialPeriod: trialDays,
    });

    let url = process.env.CLIENT_URL + "/";
    // await dynamicSendEmail(email, "user_account_creation", name, url);

    res.status(201).json({
      success: true,
      message: "User created successfully",
      data: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        createdBy,
        role: newUser.role,
        trialPeriod: newUser.trialPeriod,
        planExpires: newUser.trialExpires,
      },
    });
  } catch (error) {
    console.error("Error adding user:", error);
    res.status(500).json({ success: false, message: "Error creating user", error: error.message });
  }
};

// ---------------------- LOGOUT ----------------------
exports.logout = async (req, res) => {
  try {
    const sessionId = req.cookies.sessionId;
    if (sessionId) {
      await removeSession(sessionId);
    }

    const cookieOpts = {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      path: "/",
      maxAge: 0,
    };

    res
      .cookie("session", "", cookieOpts)
      .cookie("sessionId", "", cookieOpts)
      .json({ success: true });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
};

// ---------------------- GET USERS ----------------------
exports.getUsers = async (req, res) => {
  try {
    const { uid } = req.body;
    if (!uid) {
      return res.status(400).json({ success: false, error: "uid is required" });
    }

    const users = await User.find({ createdBy: uid });
    console.log(users);

    res.json(users);
  } catch (error) {
    console.error("user error:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
};
