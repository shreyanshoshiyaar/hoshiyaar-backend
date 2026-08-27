import { config } from 'dotenv';
import mongoose from 'mongoose';
import Chapter from './models/Chapter.js';
import Module from './models/Module.js';

config();

async function findLatest() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const latestChapter = await Chapter.findOne().sort({ createdAt: -1 });
    console.log('Latest Chapter:', latestChapter);
    
    if (latestChapter) {
        const modules = await Module.find({ chapterId: latestChapter._id }).sort({ order: 1 });
        console.log(`Modules for ${latestChapter.title}:`);
        modules.forEach(m => console.log(`- ${m.title} (Order: ${m.order})`));
    }
  } catch (error) {
    console.error(error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}
findLatest();
