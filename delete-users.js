import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import UserIncorrectQuestion from './models/UserIncorrectQuestion.js';

dotenv.config();
const MONGO_URI = process.env.MONGO_URI;

const KEEP_PHONES = ['7021970672', '9867735936'];

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log("✅ Connected to MongoDB.");

  // Find all users we want to keep
  const keepUsers = await User.find({ phone: { $in: KEEP_PHONES } });
  const keepUserIds = keepUsers.map(u => u._id);
  
  console.log(`Found ${keepUsers.length} users to keep (Phones: ${keepUsers.map(u => u.phone).join(', ')})`);

  // Delete all users that are NOT in the keep list
  const userDeleteResult = await User.deleteMany({ _id: { $nin: keepUserIds } });
  console.log(`🗑️ Deleted ${userDeleteResult.deletedCount} users from the database.`);

  // Delete all user incorrect questions for deleted users
  const uiqDeleteResult = await UserIncorrectQuestion.deleteMany({ userId: { $nin: keepUserIds } });
  console.log(`🗑️ Deleted ${uiqDeleteResult.deletedCount} incorrect question records for the deleted users.`);

  console.log("\n🎉 Database cleanup complete! Only the 2 specified users remain.");
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
