import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Module from './models/Module.js';
import Chapter from './models/Chapter.js';

dotenv.config();

async function checkModules() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const chapter = await Chapter.findOne({ title: /Temperature and its Measurement/i });
    if (!chapter) return;
    
    const mods = await Module.find({ chapterId: chapter._id });
    for (const m of mods) {
        if (m.title.toLowerCase().includes('revi')) {
            console.log(`Found module: ${m.title} (ID: ${m._id})`);
        }
    }
  } catch (error) {
    console.error(error);
  } finally {
    mongoose.connection.close();
    process.exit(0);
  }
}
checkModules();
