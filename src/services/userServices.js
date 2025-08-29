const User = require("../models/user");
// Get User by Firebase UID
async function getUserByfirebaseUid(firebaseUid) {
  return await User.findOne({ firebase_uid: firebaseUid });
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

  let planExpires = existingUser.planExpires;
  if (plan !== undefined) {
    const planDays = parseInt(plan);
    if (isNaN(planDays) || planDays < 0) {
      throw new Error("Plan duration must be a positive number");
    }
    const today = new Date();
    planExpires = new Date(today.getTime() + planDays * 24 * 60 * 60 * 1000);
  }

  const updatedUser = await User.findByIdAndUpdate(
    id,
    {
      ...(name && { name }),
      ...(email && { email }),
      ...(plan && { plan }),
      ...(role !== undefined && { role }),
      ...(plan !== undefined && { plan }),
      ...(planExpires && { planExpires }),
    },
    { new: true }
  );

  await auth.setCustomUserClaims(existingUser.firebase_uid, {
    role: updatedUser.role,
    planExpires: updatedUser.planExpires?.getTime(),
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
  getUserByfirebaseUid,
  updateUser,
  deleteUser,
  updateUserByFirebaseUid
};
