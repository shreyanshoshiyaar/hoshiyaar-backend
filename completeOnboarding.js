import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';

dotenv.config();

async function completeOnboarding() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/hoshiyaar');
    
    const phone = '7045538721';
    
    const user = await User.findOne({ phone: phone });
    if (!user) {
      console.log('User not found. Please log in first or run the recreate script again.');
      process.exit(1);
    }
    
    // Set all required fields to clear onboarding
    user.board = 'EDUVATE CBSE';
    user.classLevel = 'Class 10'; // generic
    user.subject = 'Science'; // generic
    user.chapter = 'Sample Chapter'; // generic
    user.onboardingCompleted = true;
    
    await user.save();
    console.log(`Successfully cleared onboarding steps for ${phone}!`);
    console.log(`Registered to: Board - ${user.board}, Class - ${user.classLevel}, Subject - ${user.subject}, Chapter - ${user.chapter}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

completeOnboarding();
