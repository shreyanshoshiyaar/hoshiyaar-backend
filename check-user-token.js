import { config } from 'dotenv';
import mongoose from 'mongoose';
import User from './models/User.js';

config();

async function checkUser() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    
    const phone = '9867735936';
    const user = await User.findOne({ phone: phone });
    
    if (!user) {
      console.log(`User with phone ${phone} NOT FOUND in database.`);
    } else {
      console.log('--- USER DETAILS ---');
      console.log(`Name: ${user.name || 'N/A'}`);
      console.log(`Phone: ${user.phone}`);
      console.log(`Platform: ${user.platform || 'N/A'}`);
      console.log(`Last Active: ${user.lastActiveAt}`);
      console.log(`FCM Token: ${user.fcmToken ? user.fcmToken : 'NULL / NOT SET'}`);
      console.log('--------------------');
    }
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkUser();
