import mongoose from 'mongoose';
import dotenv from 'dotenv';
import SystemSettings from './models/SystemSettings.js';

dotenv.config();

async function updateMinAndroidVersion() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const result = await SystemSettings.findOneAndUpdate(
      { key: 'min_android_version' },
      { value: '29', description: 'Minimum supported Android app build version' },
      { upsert: true, new: true }
    );

    console.log('Updated system settings successfully:');
    console.log(result);
  } catch (error) {
    console.error('Error updating system settings:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

updateMinAndroidVersion();
