import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Module from './models/Module.js';

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/hoshiyaar');
  console.log("Connected to MongoDB.");

  const result1 = await Module.updateMany(
    { title: { $regex: /difficult/i } },
    { $set: { title: 'HOT Module' } }
  );

  console.log(`Updated ${result1.modifiedCount} modules containing 'difficult' to 'HOT Module'.`);
  
  process.exit(0);
}

run().catch(console.error);
