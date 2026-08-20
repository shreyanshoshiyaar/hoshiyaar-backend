import 'dotenv/config';
import mongoose from 'mongoose';
import SystemSettings from './models/SystemSettings.js';

async function updateVersion() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to DB.");

    const setting = await SystemSettings.findOneAndUpdate(
      { key: 'min_android_version' },
      { 
        value: 43, 
        description: "Minimum supported Android app version" 
      },
      { new: true, upsert: true }
    );
    
    console.log("Successfully updated min_android_version to:", setting.value);
  } catch (err) {
    console.error("Error updating version:", err);
  } finally {
    mongoose.connection.close();
  }
}

updateVersion();
