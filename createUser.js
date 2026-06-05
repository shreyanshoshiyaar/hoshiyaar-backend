import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';

dotenv.config();

async function createUser() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/hoshiyaar');
    console.log('Connected to MongoDB');

    const phone = '7045538721';
    const password = '99999';
    const board = 'EDUVATE CBSE';

    // Check if user already exists
    let user = await User.findOne({ username: phone });
    
    if (user) {
      console.log('User already exists, updating password and board...');
      user.password = password;
      user.board = board;
      await user.save();
      console.log('User updated successfully.');
    } else {
      console.log('Creating new user...');
      user = await User.create({
        username: phone, // Assuming username is used for login with phone number
        phone: phone,
        password: password,
        board: board,
        role: 'user', // default role
        name: 'New User' // Add a dummy name
      });
      console.log('User created successfully:', user.username);
    }

    process.exit(0);
  } catch (error) {
    console.error('Error creating user:', error);
    process.exit(1);
  }
}

createUser();
