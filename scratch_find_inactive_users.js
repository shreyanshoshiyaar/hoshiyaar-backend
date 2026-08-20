import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Adjust path as needed based on where you run this script
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import User from './models/User.js';

const run = async () => {
  try {
    if (!process.env.MONGO_URI) {
      console.error('MONGO_URI is missing from .env');
      process.exit(1);
    }
    
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Users inactive before August 1st 2026
    const cutoffDate = new Date('2026-08-01T00:00:00.000Z');
    
    const inactiveUsers = await User.find({
      whatsappOptIn: true,
      phone: { $ne: null },
      lastActiveAt: { $lt: cutoffDate }
    }).select('name phone lastActiveAt');

    console.log(`Found ${inactiveUsers.length} users who have been inactive since before August 1st, 2026.`);
    
    if (inactiveUsers.length > 0) {
      console.log('Sample users:');
      inactiveUsers.slice(0, 5).forEach(u => {
        console.log(`- ${u.name || 'Unknown'}: ${u.phone} (Last active: ${u.lastActiveAt})`);
      });
    }

  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

run();
