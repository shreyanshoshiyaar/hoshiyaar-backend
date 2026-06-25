import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from './models/User.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/hoshiyaar";

async function run() {
  try {
    await mongoose.connect(MONGO_URI);
    
    const users = await User.find({}, 'platform');
    const platforms = {};
    users.forEach(u => {
      const p = u.platform || 'unknown';
      platforms[p] = (platforms[p] || 0) + 1;
    });

    console.log(platforms);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
