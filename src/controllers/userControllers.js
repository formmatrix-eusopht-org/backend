const auth = require('../lib/firebaseAdmin');
const user = require('../models/user');
const { dynamicSendEmail } = require('../utils/emailer');
const User = require("../models/user");
const { updateUserByFirebaseUid } = require('../services/userServices');
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
            plan: "trial",
            planExpiration: trialExpires,
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

// READ
exports.getUser = async (req, res) => {
    try {
        const user = await userService.getUserById(req.params.id);
        if (!user) return res.status(404).json({ success: false, message: "User not found" });
        res.json({ success: true, data: user });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateUser = async (req, res) => {
    try {
        const { uid, data } = req.body; // firebase_uid will come from route
        const updatedUser = await updateUserByFirebaseUid(uid, data);

        if (!updatedUser) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        res.json({ success: true, data: updatedUser });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};


// DELETE
exports.deleteUser = async (req, res) => {
    try {
        const result = await userService.deleteUser(req.params.id);
        res.json({ success: true, message: result.message });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.updateUserSubscription = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, password, plan, trialPeriod, role } = req.body;

        // 1. Find user in DB
        const existingUser = await user.findById(id);
        if (!existingUser) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // 2. Update Firebase Auth user
        const firebaseUpdates = {};
        if (email) firebaseUpdates.email = email;
        if (password) firebaseUpdates.password = password;
        if (name) firebaseUpdates.displayName = name;

        if (Object.keys(firebaseUpdates).length > 0) {
            await auth.updateUser(existingUser.firebase_uid, firebaseUpdates);
        }

        // 3. Handle trial period update
        let trialExpires = existingUser.trialExpires;
        if (trialPeriod !== undefined) {
            const trialDays = parseInt(trialPeriod);
            if (isNaN(trialDays) || trialDays < 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Trial period must be a positive number'
                });
            }
            const today = new Date();
            trialExpires = new Date(today.getTime() + trialDays * 24 * 60 * 60 * 1000);
        }

        // 4. Update MongoDB user
        const updatedUser = await user.findByIdAndUpdate(
            id,
            {
                ...(name && { name }),
                ...(email && { email }),
                ...(plan && { plan }),
                ...(role !== undefined && { role }),
                ...(trialPeriod !== undefined && { trialPeriod }),
                ...(trialExpires && { trialExpires }),
            },
            { new: true }
        );

        // 5. Update Firebase custom claims if role or trial changes
        await auth.setCustomUserClaims(existingUser.firebase_uid, {
            role: updatedUser.role,
            trialExpires: updatedUser.trialExpires?.getTime()
        });

        res.status(200).json({
            success: true,
            message: 'User updated successfully',
            data: updatedUser
        });
    } catch (error) {
        console.error('Error updating user:', error);

        if (error.code) {
            switch (error.code) {
                case 'auth/email-already-exists':
                    return res.status(400).json({ success: false, message: 'Email already exists' });
                case 'auth/invalid-email':
                    return res.status(400).json({ success: false, message: 'Invalid email format' });
                case 'auth/invalid-password':
                    return res.status(400).json({ success: false, message: 'Password should be at least 6 characters' });
                default:
                    return res.status(500).json({ success: false, message: 'Error updating user', error: error.message });
            }
        }

        res.status(500).json({
            success: false,
            message: 'Error updating user',
            error: error.message
        });
    }
};

exports.getUserByFirebaseUid = async (req, res) => {
    try {
        const { id } = req.params; // firebase uid comes here

        const user = await User.findOne({ firebase_uid: id });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.json(user);
    } catch (error) {
        console.error("Error fetching user by firebase_uid:", error);
        res.status(500).json({ error: "Server error" });
    }
};