import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Chapter from './models/Chapter.js';
import Unit from './models/Unit.js';
import Module from './models/Module.js';
import CurriculumItem from './models/CurriculumItem.js';
import DefaultRevisionQuestion from './models/DefaultRevisionQuestion.js';

dotenv.config();

async function inspect() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/hoshiyaar');
    
    const chapter = await Chapter.findOne({ title: /Measurement and motion/i });
    if (!chapter) {
      console.log('❌ Chapter "Measurement and motion" not found.');
      process.exit(1);
    }
    
    console.log(`\n📚 Chapter: ${chapter.title}`);
    
    const units = await Unit.find({ chapterId: chapter._id }).sort({ order: 1 });
    console.log(`   Found ${units.length} Units.`);
    
    for (const unit of units) {
      console.log(`\n   📦 Unit ${unit.order}: ${unit.title}`);
      
      const modules = await Module.find({ unitId: unit._id }).sort({ order: 1 });
      for (const mod of modules) {
        const itemsCount = await CurriculumItem.countDocuments({ moduleId: mod._id });
        const reviseCount = await DefaultRevisionQuestion.countDocuments({ moduleId: mod._id });
        
        console.log(`      📄 Module ${mod.order}: ${mod.title} -> ${itemsCount} items (${reviseCount} in revision)`);
      }
    }
    
    console.log('\n✅ Inspection complete.');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

inspect();
