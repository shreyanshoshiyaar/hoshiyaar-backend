import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Blog from './models/Blog.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const oldSlugs = [
  "temperature",
  "temperature-important-questions",
  "what-is-temperature"
];

async function deleteDuplicates() {
  try {
    const mongoURI = process.env.MONGO_URI;
    if (!mongoURI) {
      throw new Error('MONGO_URI is not defined in .env file');
    }

    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoURI);
    console.log('Connected successfully!');

    console.log('Finding and deleting old duplicate blogs...');
    
    const result = await Blog.deleteMany({ slug: { $in: oldSlugs } });
    
    console.log(`✅ Successfully deleted ${result.deletedCount} duplicate blogs!`);
    mongoose.connection.close();
  } catch (error) {
    console.error('Error deleting blogs:', error);
    mongoose.connection.close();
  }
}

deleteDuplicates();
