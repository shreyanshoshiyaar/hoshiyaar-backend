import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from './models/User.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/hoshiyaar";

async function run() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB for platform migration');

    // Users with an FCM token are almost certainly using an app (usually Android)
    const result = await User.updateMany(
      { platform: { $in: ['unknown', null, ''] }, fcmToken: { $exists: true, $ne: null } },
      { $set: { platform: 'android' } } // Safe assumption for most mobile users if unknown
    );
    
    console.log(`Updated ${result.modifiedCount} users to 'android' based on presence of FCM token.`);

    // Users who registered but have no platform, let's default to web. Actually, the frontend UserAnalytics.jsx already treats them as web, so no need to alter them.
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

run();
