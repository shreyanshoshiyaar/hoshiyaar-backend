import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Chapter from './models/Chapter.js';
import Unit from './models/Unit.js';
import Module from './models/Module.js';
import CurriculumItem from './models/CurriculumItem.js';
import DefaultRevisionQuestion from './models/DefaultRevisionQuestion.js';

dotenv.config();

async function removeUnwantedUnits() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/hoshiyaar');
    
    const chapter = await Chapter.findOne({ title: /Measurement and motion/i });
    if (!chapter) {
      console.log('❌ Chapter "Measurement and motion" not found.');
      process.exit(1);
    }
    
    const unwantedTitles = ['Unit 0', 'Unit 2'];
    
    for (const title of unwantedTitles) {
      const units = await Unit.find({ chapterId: chapter._id, title: title });
      for (const unit of units) {
        console.log(`🗑️ Deleting ${unit.title}...`);
        const modules = await Module.find({ unitId: unit._id });
        for (const mod of modules) {
          await CurriculumItem.deleteMany({ moduleId: mod._id });
          await DefaultRevisionQuestion.deleteMany({ moduleId: mod._id });
        }
        await Module.deleteMany({ unitId: unit._id });
        await Unit.deleteOne({ _id: unit._id });
      }
    }
    
    // Let's also fix the ordering of the remaining units while we are here!
    const remainingUnits = await Unit.find({ chapterId: chapter._id }).sort({ _id: 1 });
    let order = 1;
    for (const u of remainingUnits) {
       u.order = order++;
       await u.save();
    }
    
    console.log('✅ Unwanted units deleted successfully and order fixed.');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

removeUnwantedUnits();
