import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import { sendAiSensyTemplate } from './services/whatsappService.js';

dotenv.config();

const runTest = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const testNumbers = ['9867735936', '7021970672', '9820277252'];
    const users = await User.find({ phone: { $in: testNumbers } });

    console.log(`Found ${users.length} users matching test numbers.`);

    for (const user of users) {
      console.log(`Sending welcome message to ${user.name} (${user.phone})...`);
      try {
        await sendAiSensyTemplate({
          to: user.phone,
          templateName: 'welcome_after_signup',
          userName: user.name || 'Learner',
          customContactFields: {
            ParentName: user.name,
            Class: user.classLevel || '',
            SignupSource: 'Manual Test Script'
          },
          templateParams: [user.name || 'Learner']
        });
      } catch (err) {
        console.error(`Failed to send to ${user.phone}`);
      }
    }

    process.exit(0);
  } catch (error) {
    console.error('Test script error:', error);
    process.exit(1);
  }
};

runTest();
