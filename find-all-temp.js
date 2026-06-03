import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Chapter from './models/Chapter.js';
import Unit from './models/Unit.js';

dotenv.config();

async function findAllTemp() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    
    // Find all chapters with "Temperature" in their name
    const tempChapters = await Chapter.find({ title: /Temperature/i });
    console.log(`Found ${tempChapters.length} Temperature Chapters:`);
    
    for (const ch of tempChapters) {
        console.log(`\nChapter: ${ch.title} (ID: ${ch._id}, Subject: ${ch.subjectId})`);
        const units = await Unit.find({ chapterId: ch._id });
        console.log(`  Units (${units.length}):`);
        for (const u of units) {
            console.log(`  - ${u.title}`);
        }
    }
  } catch (error) {
    console.error(error);
  } finally {
    mongoose.connection.close();
    process.exit(0);
  }
}

findAllTemp();
