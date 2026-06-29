import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const ChapterSchema = new mongoose.Schema({}, { strict: false });
const Chapter = mongoose.models.Chapter || mongoose.model('Chapter', ChapterSchema);
const ModuleSchema = new mongoose.Schema({}, { strict: false });
const Module = mongoose.models.Module || mongoose.model('Module', ModuleSchema);

async function fetchFoodModules() {
  try {
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
    console.log('Connected to DB');

    // Find chapters related to Food
    const chapters = await Chapter.find({ title: { $regex: /food/i } });
    if (chapters.length === 0) {
      console.log('No chapters found with "food" in the title.');
      process.exit(0);
    }

    for (const chapter of chapters) {
      console.log(`\n========================================`);
      console.log(`Chapter: ${chapter.title} (ID: ${chapter._id})`);
      console.log(`========================================`);

      const modules = await Module.find({ chapterId: chapter._id }).sort({ order: 1 });
      if (modules.length === 0) {
        console.log('  No modules found in this chapter.');
      } else {
        modules.forEach((mod, index) => {
          console.log(`  Module ${index + 1}: ${mod.title}`);
        });
      }
    }
  } catch (err) {
    console.error(err);
  } finally {
    mongoose.disconnect();
  }
}

fetchFoodModules();
