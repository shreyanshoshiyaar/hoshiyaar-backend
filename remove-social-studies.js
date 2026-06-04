import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Subject from './models/Subject.js';
import Chapter from './models/Chapter.js';
import Unit from './models/Unit.js';
import Module from './models/Module.js';
import CurriculumItem from './models/CurriculumItem.js';

dotenv.config();
const MONGO_URI = process.env.MONGO_URI;

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log("✅ Connected to MongoDB.");

  // Find any subject matching Social Studies, SST, or Social Science
  const socialStudiesSubjects = await Subject.find({ name: /Social Studies|SST|Social Science/i });

  if (socialStudiesSubjects.length === 0) {
      console.log("⚠️ No 'Social Studies' subjects found in the database.");
  }

  for (const subject of socialStudiesSubjects) {
      console.log(`\n🗑️ Removing Subject: ${subject.name} (ID: ${subject._id})`);
      const chapters = await Chapter.find({ subjectId: subject._id });
      
      for (const ch of chapters) {
          const unitsToClear = await Unit.find({ chapterId: ch._id });
          for (const u of unitsToClear) {
              const modsToClear = await Module.find({ unitId: u._id });
              for (const m of modsToClear) {
                  const itemsDeleted = await CurriculumItem.deleteMany({ moduleId: m._id });
                  // console.log(`    Deleted ${itemsDeleted.deletedCount} items from module ${m.title}`);
              }
              const modsDeleted = await Module.deleteMany({ unitId: u._id });
              // console.log(`  Deleted ${modsDeleted.deletedCount} modules from unit ${u.title}`);
          }
          await Unit.deleteMany({ chapterId: ch._id });
      }
      const chDeleted = await Chapter.deleteMany({ subjectId: subject._id });
      console.log(`  Deleted ${chDeleted.deletedCount} chapters from this subject.`);
      
      await Subject.deleteOne({ _id: subject._id });
      console.log(`✅ Successfully completely deleted Subject: ${subject.name}`);
  }

  console.log("\n🎉 Social Studies clean-up complete!");
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
