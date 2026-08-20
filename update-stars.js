import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';

dotenv.config();

const updateStars = async () => {
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
      for (const user of users) {
        user.stars = 5936;
        await user.save();
        console.log(`Updated stars for ${user.name} (${user.phone}) to 5936.`);
      }
    }

  } catch (error) {
    console.error('Error updating user stars:', error);
  } finally {
    mongoose.disconnect();
    process.exit(0);
  }
};

updateStars();
