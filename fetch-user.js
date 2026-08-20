import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';

dotenv.config();

const fetchUser = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // Case-insensitive search for the user
    const users = await User.find({ name: { $regex: /Akshit Ravula/i } });
    
    if (users.length === 0) {
      console.log('No user found with name "Akshit Ravula".');
    } else {
      console.log(`Found ${users.length} user(s):`);
      users.forEach(user => {
        console.log(JSON.stringify(user, null, 2));
      });
    }

  } catch (error) {
    console.error('Error fetching user:', error);
  } finally {
    mongoose.disconnect();
    process.exit(0);
  }
};

fetchUser();
