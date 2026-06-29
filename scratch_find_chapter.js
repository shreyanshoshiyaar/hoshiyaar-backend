import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const UnitSchema = new mongoose.Schema({}, { strict: false });
const Unit = mongoose.models.Unit || mongoose.model('Unit', UnitSchema);
const ChapterSchema = new mongoose.Schema({}, { strict: false });
const Chapter = mongoose.models.Chapter || mongoose.model('Chapter', ChapterSchema);

async function findChapter() {
  try {
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
    const unit = await Unit.findOne({ title: { $regex: /Animal Movement/i } });
    if (unit) {
      const chapter = await Chapter.findById(unit.chapterId);
      console.log(`Found existing unit! It belongs to Chapter: ${chapter ? chapter.title : 'Unknown'}`);
    } else {
      console.log("Unit not found in DB.");
    }
  } catch (err) {
    console.error(err);
  } finally {
    mongoose.disconnect();
  }
}
findChapter();
