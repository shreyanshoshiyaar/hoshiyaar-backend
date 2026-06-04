import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Chapter from './models/Chapter.js';

dotenv.config();
const MONGO_URI = process.env.MONGO_URI;

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log("✅ Connected to MongoDB.");

  // Find the electricity chapter (it should now be in CBSE after you ran the previous script)
  const electricityChapter = await Chapter.findOne({ title: /Electricity/i });
  
  if (electricityChapter) {
      electricityChapter.title = 'Chapter 3: Electricity: Circuits and their Components';
      electricityChapter.order = 3;
      await electricityChapter.save();
      console.log(`✅ Successfully renamed the chapter to "${electricityChapter.title}" and set order to 3!`);
  } else {
      console.log("⚠️ Could not find an Electricity chapter in the database.");
  }

  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
