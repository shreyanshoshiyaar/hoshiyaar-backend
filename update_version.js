import mongoose from 'mongoose';
import dotenv from 'dotenv';
import SystemSettings from './models/SystemSettings.js';

dotenv.config();

async function updateMinVersion() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB.");

    const result = await SystemSettings.findOneAndUpdate(
      { key: 'min_android_version' },
      { value: 42, description: 'Minimum supported Android app version (build 42)' },
      { upsert: true, new: true }
    );
    
    console.log(`Updated min_android_version to: ${result.value}`);

    mongoose.disconnect();
  } catch (err) {
    console.error(err);
    mongoose.disconnect();
  }
}

updateMinVersion();
