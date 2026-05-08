import mongoose from 'mongoose';
import { config } from 'dotenv';
import User from './models/User.js';

config();

const hostUsers = [
  {
    username: 'Host',
    name: 'Host User',
    dateOfBirth: new Date('2000-01-01'),
    onboardingCompleted: true,
    board: 'CBSE',
    classLevel: '6',
    subject: 'Science',
    chapter: 'Food'
  },
  {
    username: 'hostcbse',
    name: 'Host CBSE',
    dateOfBirth: new Date('2000-01-01'),
    onboardingCompleted: true,
    board: 'CBSE',
    classLevel: '6',
    subject: 'Science',
    chapter: 'Food'
  }
];

const seedHostUsers = async () => {
  try {
    console.log('🌱 Starting host user seeding...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    for (const userData of hostUsers) {
      const existingUser = await User.findOne({ username: userData.username });
      if (existingUser) {
        console.log(`⚠️ User "${userData.username}" already exists. Updating...`);
        await User.findOneAndUpdate({ username: userData.username }, userData);
        continue;
      }
      
      await User.create(userData);
      console.log(`✅ User created: ${userData.username} (Login with DOB: 01/01/2000)`);
    }

    console.log('🎉 Host user seeding completed!');
  } catch (error) {
    console.error('❌ Error seeding users:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

seedHostUsers();
