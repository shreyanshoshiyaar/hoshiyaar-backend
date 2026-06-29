import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const ModuleSchema = new mongoose.Schema({}, { strict: false });
const Module = mongoose.models.Module || mongoose.model('Module', ModuleSchema);
const ChapterSchema = new mongoose.Schema({}, { strict: false });
const Chapter = mongoose.models.Chapter || mongoose.model('Chapter', ChapterSchema);

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
    console.log('Connected to DB');

    // Find the Exploring Magnets chapter
    const chapter = await Chapter.findOne({ title: { $regex: /Exploring Magnets/i } });
    if (!chapter) {
      console.log('Chapter not found');
      process.exit(0);
    }
    console.log('Found chapter:', chapter.title, chapter._id);

    // Find modules for this chapter
    const modules = await Module.find({ chapterId: chapter._id });
    console.log(`Found ${modules.length} modules`);

    for (const mod of modules) {
      console.log(`\nModule: ${mod.title}`);
      if (mod.content) {
        mod.content.forEach((contentItem, idx) => {
          if (contentItem.type === 'video') {
            console.log(`  [Video ${idx}] URL: ${contentItem.videoUrl}`);
          }
        });
      }
    }
  } catch (err) {
    console.error(err);
  } finally {
    mongoose.disconnect();
  }
}

run();
