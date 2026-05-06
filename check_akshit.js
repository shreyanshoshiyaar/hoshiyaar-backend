import mongoose from 'mongoose';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import User from './models/User.js';

dotenv.config();

const checkAkshit = async () => {
  try {
    await connectDB();
    const user = await User.findOne({ username: 'AKSHITRAVULA' });
    if (user) {
      console.log(`User: ${user.username}`);
      console.log(`School: ${user.school}`);
      console.log(`BoardId: ${user.boardId}`);
    } else {
      console.log('User AKSHITRAVULA not found');
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

checkAkshit();
