import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Chapter from './models/Chapter.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log("✅ Connected to MongoDB.");

  // Fix Chapter 2
  await Chapter.updateOne(
    { title: /Chapter 2: Diversity in the Living World/i },
    { $set: { order: 2 } }
  );

  // Fix Chapter 3
  await Chapter.updateOne(
    { title: /Chapter 3: Mindful eating/i },
    { $set: { order: 3 } }
  );

  console.log("✅ Fixed chapter order numbers for Class 6 CBSE.");
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
