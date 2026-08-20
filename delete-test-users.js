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
    const usernamesToDelete = ['test', 'testt', 'testtt', 'testttt'];
    
    // Find before deleting just to verify
    const users = await User.find({ username: { $in: usernamesToDelete } }).select('username phone');
    console.log(`Found ${users.length} users to delete:`, users);

    const result = await User.deleteMany({ username: { $in: usernamesToDelete } });
    console.log(`\nSuccessfully deleted ${result.deletedCount} users.`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    mongoose.connection.close();
    process.exit(0);
  }
};

run();
