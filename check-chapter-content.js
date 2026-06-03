import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Chapter from './models/Chapter.js';
import Unit from './models/Unit.js';
import Module from './models/Module.js';

dotenv.config();

async function listChapterContent() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB.");

    const chapter = await Chapter.findOne({ title: /Temperature and its Measurement/i });
    if (!chapter) {
        console.log("❌ Chapter not found!");
        process.exit(1);
    }
    console.log(`\nChapter: ${chapter.title} (ID: ${chapter._id})`);
    
    const units = await Unit.find({ chapterId: chapter._id });
    console.log(`Total Units: ${units.length}`);
    
    for (const u of units) {
        const mods = await Module.find({ unitId: u._id });
        console.log(`\nUnit: ${u.title} (Mods: ${mods.length})`);
        mods.forEach(m => console.log(`  - Module: ${m.title}`));
    }
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    mongoose.connection.close();
    process.exit(0);
  }
}

listChapterContent();
