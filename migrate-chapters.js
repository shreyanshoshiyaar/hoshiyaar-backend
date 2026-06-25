import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Chapter from './models/Chapter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const MONGODB_URI = process.env.MONGO_URI || "mongodb://localhost:27017/hoshiyaar";

async function run() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const result = await Chapter.updateMany(
      { isPublished: { $ne: true } },
      { $set: { isPublished: true } }
    );
    
    console.log(`Updated ${result.modifiedCount} existing chapters to isPublished: true.`);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

run();
