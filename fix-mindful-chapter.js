import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Chapter from './models/Chapter.js';
import Unit from './models/Unit.js';
import Module from './models/Module.js';
import CurriculumItem from './models/CurriculumItem.js';
import Subject from './models/Subject.js';

dotenv.config();

async function fixMindfulChapter() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const subject = await Subject.findById('69d8dcff196175f4c13220fc');
    if (!subject) {
      console.log('Subject Science not found!');
      process.exit(1);
    }

    // Find the chapter (could be under the old name or new name)
    let chapter = await Chapter.findOne({ subjectId: subject._id, title: /Mindful eating/i });
    
    if (chapter) {
      console.log(`Found Chapter: ${chapter.title}`);
      chapter.title = "Chapter 3: Health - The Ultimate Treasure";
      await chapter.save();
      console.log(`✅ Renamed Chapter to: ${chapter.title}`);
    } else {
      chapter = await Chapter.findOne({ subjectId: subject._id, title: /Health - The Ultimate Treasure/i });
      if (chapter) {
        console.log(`✅ Chapter already named: ${chapter.title}`);
      } else {
        console.log('❌ Could not find the chapter to rename.');
      }
    }

    if (chapter) {
      const units = await Unit.find({ chapterId: chapter._id });
      console.log(`\nFound ${units.length} Units in this chapter:`);
      
      let totalModules = 0;
      let totalItems = 0;

      for (const unit of units) {
        const modules = await Module.find({ unitId: unit._id });
        console.log(`  - Unit: ${unit.title} (${modules.length} modules)`);
        totalModules += modules.length;
        
        for (const mod of modules) {
          const items = await CurriculumItem.find({ moduleId: mod._id });
          totalItems += items.length;
          // Just print the first module's items to verify the fields aren't mismatched
          if (totalModules === 1) {
             console.log(`    Module [${mod.title}] sample items:`);
             items.slice(0, 3).forEach(item => {
               console.log(`      -> Type: ${item.type}, Question: ${item.question ? item.question.substring(0, 30) : 'N/A'}, Text: ${item.text ? item.text.substring(0, 30) : 'N/A'}`);
             });
          }
        }
      }
      console.log(`\nTotal Modules: ${totalModules}`);
      console.log(`Total Curriculum Items: ${totalItems}`);
      
      if (totalItems === 0) {
        console.log('\n⚠️ WARNING: There are no items uploaded for this chapter! The fields might have been mismatched during upload.');
      } else {
        console.log('\n✅ Items seem to be uploaded correctly.');
      }
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    mongoose.connection.close();
    process.exit(0);
  }
}

fixMindfulChapter();
