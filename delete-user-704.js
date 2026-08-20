import { config } from 'dotenv';
import mongoose from 'mongoose';
import User from './models/User.js';
import Otp from './models/Otp.js';
import OtpRateLimit from './models/OtpRateLimit.js';

config();

async function deleteUserAllFormats() {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Sometimes numbers are saved with +91 or 91, or used as the username
    const regex = new RegExp('7045538721', 'i');

    const users = await User.find({
      $or: [
        { phone: { $regex: regex } },
        { username: { $regex: regex } }
      ]
    });

    if (users.length === 0) {
      console.log('No users found matching 7045538721 in phone or username.');
    } else {
      console.log(`Found ${users.length} users matching this number! Deleting them...`);
      for (const user of users) {
        console.log(`- Deleting User ID: ${user._id} (Username: ${user.username}, Phone: ${user.phone})`);
        await User.deleteOne({ _id: user._id });
      }
      console.log('✅ Deleted all matching users!');
    }

    // Clean up OTP records using the same regex
    const otpResult = await Otp.deleteMany({ phone: { $regex: regex } });
    const rateLimitResult = await OtpRateLimit.deleteMany({ phone: { $regex: regex } });
    
    console.log(`✅ Cleaned up ${otpResult.deletedCount} OTP records and ${rateLimitResult.deletedCount} Rate Limit records.`);

  } catch (error) {
    console.error('❌ Error deleting user:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Database disconnected.');
    process.exit(0);
  }
}

deleteUserAllFormats();
