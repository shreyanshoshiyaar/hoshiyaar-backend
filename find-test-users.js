import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

import User from './models/User.js';

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB Connected');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error.message);
    process.exit(1);
  }
};

const run = async () => {
  await connectDB();
  try {
    // Find users where username or name starts with 'test' (case-insensitive)
    const query = {
      $or: [
        { username: { $regex: /^test/i } },
        { name: { $regex: /^test/i } }
      ]
    };
    
    const count = await User.countDocuments(query);
    const users = await User.find(query).select('name username phone platform lastActiveAt').lean();
    
    console.log(`\nFound ${count} users with name or username starting with 'test':`);
    users.forEach((user, idx) => {
      console.log(`\nUser ${idx + 1}:`);
      console.log(`  Name:     ${user.name}`);
      console.log(`  Username: ${user.username}`);
      console.log(`  Phone:    ${user.phone}`);
      console.log(`  Platform: ${user.platform}`);
      console.log(`  Last Active: ${user.lastActiveAt ? new Date(user.lastActiveAt).toLocaleString() : 'N/A'}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    mongoose.connection.close();
    process.exit(0);
  }
};

run();
