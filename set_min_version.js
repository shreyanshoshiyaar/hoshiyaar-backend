import mongoose from 'mongoose';
import dotenv from 'dotenv';
import SystemSettings from './models/SystemSettings.js';

dotenv.config();

async function setMinVersion() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB');

    await SystemSettings.findOneAndUpdate(
      { key: 'min_android_version' },
      { value: 40, description: 'Minimum supported Android app version' },
      { upsert: true }
    );
    
    console.log('Successfully set min_android_version to 40');
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

setMinVersion();
