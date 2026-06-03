import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Chapter from './models/Chapter.js';
import Unit from './models/Unit.js';

dotenv.config();

async function checkUnits() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const oldChapter = await Chapter.findOne({ title: /Temperature and its Measurement/i });
    if (!oldChapter) {
        console.log("No chapter found");
        process.exit(1);
    }
    const units = await Unit.find({ chapterId: oldChapter._id });
    console.log(`Chapter: ${oldChapter.title}`);
    console.log(`Units found: ${units.length}`);
    for (const u of units) {
        console.log(`- Unit: ${u.title}`);
    }
  } catch (error) {
    console.error(error);
  } finally {
    mongoose.connection.close();
    process.exit(0);
  }
}
checkUnits();
