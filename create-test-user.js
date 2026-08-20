import { config } from 'dotenv';
import mongoose from 'mongoose';
import User from './models/User.js';

config();

async function createTestUser() {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const testUsername = 'testuser';
    const testPassword = 'password123';
    const testPhone = '9999999999';

    // Check if test user already exists and delete it for a fresh start
    const existingUser = await User.findOne({ username: testUsername });
    if (existingUser) {
      console.log('Test user already exists. Deleting to create a fresh one...');
      await User.deleteOne({ username: testUsername });
    }
    
    // Also check if any user has the test phone to avoid unique constraint errors if phone is unique
    await User.deleteMany({ phone: testPhone });

    console.log('Creating fresh test user...');
    
    // Create new test user
    // We set onboardingCompleted to false so you can test the exact flow of a new user!
    const newUser = new User({
      username: testUsername,
      password: testPassword, // The pre-save hook in User.js will hash this automatically!
      name: 'Test Learner',
      email: 'testuser@hoshiyaar.info',
      phone: testPhone,
      onboardingCompleted: false, // Set to false to test the onboarding flow
      chaptersProgress: [],
      totalPoints: 0
    });

    await newUser.save();
    console.log('✅ Test user successfully created!');
    console.log('-----------------------------------');
    console.log(`Username: ${testUsername}`);
    console.log(`Password: ${testPassword}`);
    console.log('-----------------------------------');
    console.log('You can now log in with these credentials to test the full flow.');

  } catch (error) {
    console.error('❌ Error creating test user:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Database disconnected.');
    process.exit(0);
  }
}

createTestUser();
