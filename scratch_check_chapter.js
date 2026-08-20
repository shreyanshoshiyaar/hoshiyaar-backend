import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Chapter from './models/Chapter.js';

dotenv.config();

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    
    const chapters = await Chapter.find({ title: { $regex: /Changes Around Us|Physical & Chemical/i } });
    console.log("Existing chapters matching 'Changes Around Us':");
    chapters.forEach(c => console.log(c.title));

    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

run();
