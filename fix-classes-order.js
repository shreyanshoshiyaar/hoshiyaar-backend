import mongoose from 'mongoose';
import dotenv from 'dotenv';
import ClassLevel from './models/ClassLevel.js';

dotenv.config();
const MONGO_URI = process.env.MONGO_URI;

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log("✅ Connected to MongoDB.");

  const classes = await ClassLevel.find();
  let updatedCount = 0;

  for (const cls of classes) {
      // Parse the class name into an integer (e.g. '6' -> 6, '7' -> 7)
      const numericOrder = parseInt(cls.name, 10);
      
      if (!isNaN(numericOrder)) {
          cls.order = numericOrder;
          await cls.save();
          console.log(`✅ Set order of Class '${cls.name}' to ${numericOrder}`);
          updatedCount++;
      } else {
          console.log(`⚠️ Skipped Class '${cls.name}': Not a number`);
      }
  }

  console.log(`\n🎉 Successfully fixed the sorting order for ${updatedCount} classes!`);
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
