import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Chapter from './models/Chapter.js';

dotenv.config();

async function removeDuplicateChapter() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB.");

    const result = await Chapter.deleteOne({ title: "Measurement of Length and Motion (Coming Soon)" });
    console.log(`Deleted ${result.deletedCount} chapter(s).`);

    mongoose.disconnect();
  } catch (err) {
    console.error(err);
    mongoose.disconnect();
  }
}

removeDuplicateChapter();
