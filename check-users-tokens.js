import { config } from 'dotenv';
import mongoose from 'mongoose';
import User from './models/User.js';

config();

async function checkUsers() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    
    const totalUsers = await User.countDocuments();
    const usersWithTokens = await User.countDocuments({ fcmToken: { $ne: null } });
    
    console.log(`Total Users in DB: ${totalUsers}`);
    console.log(`Users with FCM Tokens: ${usersWithTokens}`);
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkUsers();
