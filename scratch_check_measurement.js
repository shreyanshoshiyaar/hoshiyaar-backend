import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Chapter from './models/Chapter.js';
import Module from './models/Module.js';
import CurriculumItem from './models/CurriculumItem.js';

dotenv.config();
const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB.");

  const chapterTitle = 'Chapter 5: Measurement of Length and Motion';
  const chapter = await Chapter.findOne({ title: chapterTitle });
  if (!chapter) {
    console.log("Chapter not found");
    process.exit(0);
  }

  const modules = await Module.find({ chapterId: chapter._id }).sort({ order: 1 });
  console.log(`Found ${modules.length} modules.`);

  for (const mod of modules) {
    const items = await CurriculumItem.find({ moduleId: mod._id }).sort({ order: 1 });
    console.log(`- Module [${mod.order}] "${mod.title}" has ${items.length} items`);
    // print a few items
    items.slice(0, 2).forEach(item => {
        console.log(`    -> [${item.order}] ${item.type} (Q: ${item.question ? item.question.substring(0, 30) : ''}...)`);
    });
  }

  process.exit(0);
}

run();
