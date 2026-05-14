import mongoose from 'mongoose';
import { config } from 'dotenv';
import User from './models/User.js';

config();

const updateAdminRoles = async () => {
  try {
    console.log('🌱 Starting admin role update...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const adminUsernames = ['Host', 'hostcbse'];
    
    const result = await User.updateMany(
      { username: { $in: adminUsernames } },
      { $set: { role: 'admin' } }
    );

    console.log(`✅ Updated ${result.modifiedCount} users to admin role.`);
    
    // Verify
    const admins = await User.find({ role: 'admin' });
    console.log('Current admins in database:', admins.map(u => u.username));

    console.log('🎉 Admin role update completed!');
  } catch (error) {
    console.error('❌ Error updating roles:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

updateAdminRoles();
