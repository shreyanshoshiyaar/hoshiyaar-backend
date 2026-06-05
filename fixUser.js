import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';

dotenv.config();

async function fixUser() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/hoshiyaar');
    
    const phone = '7045538721';
    const password = '99999';
    const board = 'EDUVATE CBSE';

    // Find the user by phone
    let user = await User.findOne({ phone: phone });
    
    if (user) {
      console.log('User found by phone, forcing password update...');
      // Force password update to ensure no weird caching or hashing issues
      user.password = password;
      user.board = board;
      await user.save();
      console.log('User updated successfully.');
    } else {
      console.log('User NOT found by phone! Checking by username...');
      user = await User.findOne({ username: phone });
      if (user) {
        console.log('User found by username. Adding phone field...');
        user.phone = phone;
        user.password = password;
        user.board = board;
        await user.save();
        console.log('User updated successfully.');
      } else {
        console.log('User completely missing. Creating anew...');
        user = await User.create({
          username: phone,
          phone: phone,
          password: password,
          board: board,
          role: 'user',
          name: 'New User'
        });
        console.log('User created successfully.');
      }
    }
    
    // Verify the password matches correctly using the schema method
    const verifyUser = await User.findOne({ phone: phone });
    const isMatch = await verifyUser.matchPassword(password);
    console.log(`Final Verification - Password Match: ${isMatch}`);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixUser();
