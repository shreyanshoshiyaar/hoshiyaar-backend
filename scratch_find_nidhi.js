import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import User from './models/User.js';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const run = async () => {
  try {
    if (!process.env.MONGO_URI) {
      console.error('MONGO_URI is missing from .env');
      process.exit(1);
    }
    
    await mongoose.connect(process.env.MONGO_URI);
    
    // Case-insensitive search for "nidhi"
    const users = await User.find({ name: { $regex: /nidhi/i } }).select('name phone lastActiveAt whatsappOptIn createdAt');
    
    console.log(`\n🔍 Found ${users.length} user(s) matching "nidhi":`);
    
    users.forEach(u => {
      console.log(`- Name: ${u.name}`);
      console.log(`  Phone: ${u.phone}`);
      console.log(`  Opted into WhatsApp: ${u.whatsappOptIn}`);
      console.log(`  Last Active: ${u.lastActiveAt}`);
      console.log(`  Joined: ${u.createdAt}`);
      console.log('------------------------');
    });

  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

run();
