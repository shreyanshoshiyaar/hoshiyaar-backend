import mongoose from 'mongoose';
import dotenv from 'dotenv';
import SystemSettings from './models/SystemSettings.js';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

async function run() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB.");

    const key = 'min_android_version';
    const value = 999;

    const updated = await SystemSettings.findOneAndUpdate(
      { key: key },
      { $set: { value: value, description: 'Minimum supported Android app version' } },
      { new: true, upsert: true }
    );

    console.log(`🎉 Successfully set ${key} to ${updated.value}`);
    process.exit(0);
  } catch (error) {
    console.error("❌ Error updating system setting:", error);
    process.exit(1);
  }
}

run();
