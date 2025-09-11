const auth = require('../lib/firebaseAdmin');
const User = require('../models/user');
const { dynamicSendEmail } = require('../utils/emailer');
const { updateUserByFirebaseUid } = require('../services/userServices');

// CREATE USER
exports.addUser = async (req, res) => {
  try {
    const { name, email, password, trialPeriod = 14, createdBy } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide name, email and password' });
    }

    const trialDays = parseInt(trialPeriod);
    if (isNaN(trialDays) || trialDays < 0) {
      return res.status(400).json({ success: false, message: 'Trial period must be a positive number' });
    }

    // Create user in Firebase
    const userRecord = await auth.createUser({ email, password, displayName: name });

    // Calculate planExpiration
    const today = new Date();
    const planExpiration = new Date(today.getTime() + trialDays * 24 * 60 * 60 * 1000);

    // Save user in DB
    const newUser = await User.create({
      firebase_uid: userRecord.uid,
      name,
      email,
      createdBy,
      plan: "trial",
      role: 1,
      trialPeriod: trialDays,
      planExpiration
    });

    // Set custom claims in Firebase
    await auth.setCustomUserClaims(userRecord.uid, {
      role: 1,
      planExpires: planExpiration.getTime()
    });

    // Send welcome email
    // const url = process.env.CLIENT_URL + "/";
    // await dynamicSendEmail(email, "user_account_creation", name, url);

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: newUser // will serialize planExpiration as ISO string
    });

  } catch (error) {
    console.error('Error adding user:', error);

    if (error.code) {
      switch (error.code) {
        case 'auth/email-already-exists':
          return res.status(400).json({ success: false, message: 'Email already exists' });
        case 'auth/invalid-email':
          return res.status(400).json({ success: false, message: 'Invalid email format' });
        case 'auth/invalid-password':
          return res.status(400).json({ success: false, message: 'Password should be at least 6 characters' });
        default:
          return res.status(500).json({ success: false, message: 'Error creating user', error: error.message });
      }
    }

    res.status(500).json({ success: false, message: 'Error creating user', error: error.message });
  }
};

// READ
exports.getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    res.json({ success: true, data: user }); // planExpiration will be ISO
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// UPDATE USER
exports.updateUser = async (req, res) => {
  try {
    const { uid, data } = req.body;
    const updatedUser = await updateUserByFirebaseUid(uid, data);

    if (!updatedUser) return res.status(404).json({ success: false, message: "User not found" });

    res.json({ success: true, data: updatedUser });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE
exports.deleteUser = async (req, res) => {
  try {
    const result = await User.findByIdAndDelete(req.params.id);
    if (!result) return res.status(404).json({ success: false, message: "User not found" });
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// UPDATE USER SUBSCRIPTION
exports.updateUserSubscription = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, password, plan, trialPeriod, role } = req.body;

    const existingUser = await User.findById(id);
    if (!existingUser) return res.status(404).json({ success: false, message: 'User not found' });

    // Update Firebase Auth
    const firebaseUpdates = {};
    if (email) firebaseUpdates.email = email;
    if (password) firebaseUpdates.password = password;
    if (name) firebaseUpdates.displayName = name;
    if (Object.keys(firebaseUpdates).length > 0) {
      await auth.updateUser(existingUser.firebase_uid, firebaseUpdates);
    }

    // Update planExpiration if trialPeriod changes
    let planExpiration = existingUser.planExpiration;
    const planDays = trialPeriod !== undefined ? parseInt(trialPeriod) : existingUser.trialPeriod;
    if (!isNaN(planDays) && planDays >= 0) {
      planExpiration = new Date(Date.now() + planDays * 24 * 60 * 60 * 1000);
    }

    const updatedUser = await User.findByIdAndUpdate(
      id,
      {
        ...(name && { name }),
        ...(email && { email }),
        ...(role !== undefined && { role }),
        ...(plan && { plan }),
        ...(trialPeriod !== undefined && { trialPeriod }),
        ...(planExpiration && { planExpiration })
      },
      { new: true }
    );

    await auth.setCustomUserClaims(existingUser.firebase_uid, {
      role: updatedUser.role,
      planExpires: updatedUser.planExpiration.getTime()
    });

    res.status(200).json({ success: true, message: 'User updated successfully', data: updatedUser });
  } catch (error) {
    console.error('Error updating user subscription:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET USER BY FIREBASE UID
exports.getUserByFirebaseUid = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findOne({ firebase_uid: id });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    res.json({ success: true, data: user });
  } catch (error) {
    console.error("Error fetching user by firebase_uid:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
