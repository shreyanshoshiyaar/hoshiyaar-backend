import mongoose from 'mongoose';
import { config } from 'dotenv';
import User from './models/User.js';

config();

const grantAdmin = async () => {
  try {
    console.log('🌱 Granting admin permissions to AKSHITRAVULA...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const result = await User.updateOne(
      { username: 'AKSHITRAVULA' },
      { $set: { role: 'admin' } }
    );

    if (result.matchedCount === 0) {
      console.log('❌ User AKSHITRAVULA not found.');
    } else {
      console.log('✅ Updated AKSHITRAVULA to admin role.');
    }
    
    // Verify
    const admins = await User.find({ role: 'admin' });
    console.log('Current admins in database:', admins.map(u => u.username));

  } catch (error) {
    console.error('❌ Error updating roles:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

grantAdmin();
