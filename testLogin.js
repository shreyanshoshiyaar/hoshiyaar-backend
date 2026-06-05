import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';

dotenv.config();

async function testLogin() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/hoshiyaar');
    
    const phone = '7045538721';
    const password = '99999';

    const user = await User.findOne({ phone });
    if (!user) {
      console.log('User not found by phone');
      process.exit(1);
    }
    
    console.log('User found! Hashed password in DB:', user.password);
    
    const isMatch = await user.matchPassword(password);
    console.log('Password match result:', isMatch);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testLogin();
