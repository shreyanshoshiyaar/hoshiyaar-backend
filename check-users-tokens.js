import { config } from 'dotenv';
import mongoose from 'mongoose';
import User from './models/User.js';

config();

async function checkUsers() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    
    const totalUsers = await User.countDocuments();
    const usersWithTokens = await User.find({ fcmToken: { $ne: null } }).select('username name email fcmToken platform lastActiveAt');
    
    console.log(`Total Users in DB: ${totalUsers}`);
    console.log(`Users with FCM Tokens: ${usersWithTokens.length}`);
    
    if (usersWithTokens.length > 0) {
      console.log('\n--- Details of Users with Tokens ---');
      usersWithTokens.forEach((u, i) => {
        console.log(`\nUser ${i + 1}:`);
        console.log(`  Name:     ${u.name || 'N/A'}`);
        console.log(`  Username: ${u.username || 'N/A'}`);
        console.log(`  Email:    ${u.email || 'N/A'}`);
        console.log(`  Platform: ${u.platform || 'N/A'}`);
        console.log(`  Last Active: ${u.lastActiveAt ? u.lastActiveAt.toLocaleString() : 'N/A'}`);
      });
    }
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkUsers();
