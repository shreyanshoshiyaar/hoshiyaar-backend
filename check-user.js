import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';

dotenv.config();
const MONGO_URI = process.env.MONGO_URI;

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB.");

  const users = await User.find({ name: /Akshit/i });
  console.log("Found users:");
  users.forEach(u => console.log(u.username, u.phone, u.name));

  process.exit(0);
}

run().catch(console.error);
