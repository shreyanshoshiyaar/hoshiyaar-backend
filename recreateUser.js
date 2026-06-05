import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';

dotenv.config();

async function recreateUser() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/hoshiyaar');
    
    const phone = '7045538721';
    const password = '99999';
    const board = 'EDUVATE CBSE';

    console.log(`Connecting to database...`);
    
    console.log(`Deleting any existing users with phone or username ${phone}...`);
    // Delete any old conflicting accounts completely
    const deleteResult = await User.deleteMany({ $or: [{ phone: phone }, { username: phone }] });
    console.log(`Deleted ${deleteResult.deletedCount} old records.`);
    
    console.log('Creating completely fresh user record...');
    
    const user = new User({
      username: phone,
      phone: phone,
      password: password,
      board: board,
      role: 'user',
      name: 'Test User',
      onboardingCompleted: true // So it doesn't get stuck on the onboarding screen
    });
    
    await user.save();
    console.log('User completely recreated successfully!');
    
    // Double check the password match exactly as the backend would
    const fetchedUser = await User.findOne({ phone: phone });
    const isMatch = await fetchedUser.matchPassword(password);
    
    console.log(`Final Database Password Match Test: ${isMatch ? 'PASSED' : 'FAILED'}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

recreateUser();
