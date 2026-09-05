import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

async function run() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB.");

    const phone = '9867735936';
    
    // Find the user by phone number
    const user = await User.findOne({ 
      $or: [
        { phone: '9867735936' },
        { phone: '919867735936' },
        { phone: '+919867735936' }
      ]
    });
    
    if (!user) {
        console.log(`❌ Could not find user with phone number ${phone}`);
        process.exit(1);
    }

    user.role = 'admin';
    await user.save();

    console.log(`🎉 Successfully updated role for ${user.username || user.name || phone} to admin!`);
    process.exit(0);
  } catch (error) {
    console.error("❌ Error updating user role:", error);
    process.exit(1);
  }
}

run();
