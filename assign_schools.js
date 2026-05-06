import mongoose from 'mongoose';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import User from './models/User.js';

dotenv.config();

const assignSchools = async () => {
  const schoolName = "Narayana E-Techno School - Borivali (Narayana Etechno-School - Borivali), Shanti Ashram Rd, Opposite Mansi Enclave, Devki Nagar, Borivali, Mumbai, Maharashtra, 400092, India";
  
  try {
    await connectDB();

    // 1. Update AKSHITRAVULA
    const akshit = await User.findOne({ username: 'AKSHITRAVULA' });
    if (akshit) {
      akshit.school = schoolName;
      await akshit.save();
      console.log('Updated AKSHITRAVULA with school.');
    } else {
      console.log('User AKSHITRAVULA not found.');
    }

    // 2. Find 4 other users to share the same school
    const others = await User.find({ username: { $ne: 'AKSHITRAVULA' } }).limit(4);
    
    if (others.length === 0) {
      console.log('No other users found in database to update.');
    }

    for (const user of others) {
      user.school = schoolName;
      // Also ensure they have some points so they appear on the leaderboard
      if (user.totalPoints === 0) {
        user.totalPoints = Math.floor(Math.random() * 500) + 100;
      }
      await user.save();
      console.log(`Updated user ${user.username} with school and points.`);
    }

    console.log(`Successfully processed ${others.length + (akshit ? 1 : 0)} users.`);
    process.exit(0);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

assignSchools();
