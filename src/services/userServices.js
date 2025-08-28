const User = require("../models/user");
// Get User by ID
async function getUserById(id) {
  return await User.findById(id);
}

// Update User
async function updateUser(id, updates) {
  const { name, email, password, plan, trialPeriod, role } = updates;

  const existingUser = await User.findById(id);
  if (!existingUser) throw new Error("User not found");

  const firebaseUpdates = {};
  if (email) firebaseUpdates.email = email;
  if (password) firebaseUpdates.password = password;
  if (name) firebaseUpdates.displayName = name;

  if (Object.keys(firebaseUpdates).length > 0) {
    await auth.updateUser(existingUser.firebase_uid, firebaseUpdates);
  }

  let trialExpires = existingUser.trialExpires;
  if (trialPeriod !== undefined) {
    const trialDays = parseInt(trialPeriod);
    if (isNaN(trialDays) || trialDays < 0) {
      throw new Error("Trial period must be a positive number");
    }
    const today = new Date();
    trialExpires = new Date(today.getTime() + trialDays * 24 * 60 * 60 * 1000);
  }

  const updatedUser = await User.findByIdAndUpdate(
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

  await auth.setCustomUserClaims(existingUser.firebase_uid, {
    role: updatedUser.role,
    trialExpires: updatedUser.trialExpires?.getTime(),
  });

  return updatedUser;
}
const updateUserByFirebaseUid = async (firebase_uid, updateData) => {
  try {
    const updatedUser = await User.findOneAndUpdate(
      { firebase_uid },          // search condition
      { $set: updateData },      // update data
      { new: true }              // return updated document
    );
    return updatedUser;
  } catch (error) {
    console.error('Error updating user by Firebase UID:', error);
    throw new Error('Error updating user');
  }
};
// Delete User
async function deleteUser(id) {
  const existingUser = await User.findById(id);
  if (!existingUser) throw new Error("User not found");

  await auth.deleteUser(existingUser.firebase_uid);
  await User.findByIdAndDelete(id);

  return { message: "User deleted successfully" };
}

module.exports = {
  getUserById,
  updateUser,
  deleteUser,
  updateUserByFirebaseUid
};
