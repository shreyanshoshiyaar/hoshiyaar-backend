import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from './models/User.js'; // Adjust path if needed

dotenv.config();

const updateAccount = async () => {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected!');

    // The user to update
    const username = 'AKSHITRAVULA';
    const newPhone = '9867735936';
    const newEmail = 'cg.akshitravula2025@gmail.com';
    const defaultPassword = '999999';

    console.log(`Looking for user: ${username}...`);
    
    const user = await User.findOne({ username });

    if (!user) {
      console.log(`❌ User ${username} not found!`);
      process.exit(1);
    }

    user.phone = newPhone;
    user.email = newEmail;
    user.password = defaultPassword; // The pre-save hook in User.js will hash it automatically!

    await user.save();

    console.log(`✅ Success! Updated ${username}:`);
    console.log(`   - Phone: ${user.phone}`);
    console.log(`   - Email: ${user.email}`);
    console.log(`   - Password: ${defaultPassword}`);
    
    console.log('\nYou can now log in using phone number 9867735936 and password 999999!');

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
};

updateAccount();
