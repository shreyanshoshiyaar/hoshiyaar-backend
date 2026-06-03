import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Chapter from './models/Chapter.js';

dotenv.config();

async function listChapters() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB.");

    const chapters = await Chapter.find({}).sort({ order: 1 });
    console.log(`\nHere are all the chapters in the database:`);
    console.log(`-------------------------------------------`);
    
    for (const ch of chapters) {
        console.log(`Title: "${ch.title}", Order: ${ch.order}, ID: ${ch._id}, Subject ID: ${ch.subjectId}`);
    }

    console.log(`-------------------------------------------`);
    
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    mongoose.connection.close();
    process.exit(0);
  }
}

listChapters();
