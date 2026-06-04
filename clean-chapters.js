import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Board from './models/Board.js';
import ClassLevel from './models/ClassLevel.js';
import Subject from './models/Subject.js';
import Chapter from './models/Chapter.js';
import Unit from './models/Unit.js';
import Module from './models/Module.js';
import CurriculumItem from './models/CurriculumItem.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

const titlesToDelete = [
    'Chapter 10: Living Creatures: Exploring their Characteristics',
    'Chapter 4: Exploring Magnets',
    'Nidhi Flow - Food we eat',
    'Temperature and its Measurement'
];

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log("✅ Connected to MongoDB.");

  const board = await Board.findOne({ name: 'CBSE' });
  const cls = await ClassLevel.findOne({ boardId: board._id, name: '6' });
  const sub = await Subject.findOne({ boardId: board._id, classId: cls._id, name: 'Science' });

  for (const title of titlesToDelete) {
      console.log(`\n🔍 Looking for: ${title}`);
      const chapters = await Chapter.find({ subjectId: sub._id, title: title });
      
      for (const ch of chapters) {
          console.log(`🗑️ Deleting chapter: ${ch.title} (ID: ${ch._id})`);
          
          const unitsToClear = await Unit.find({ chapterId: ch._id });
          for (const u of unitsToClear) {
              const modsToClear = await Module.find({ unitId: u._id });
              for (const m of modsToClear) {
                  const itemsDeleted = await CurriculumItem.deleteMany({ moduleId: m._id });
                  console.log(`    Deleted ${itemsDeleted.deletedCount} curriculum items from module ${m.title}`);
              }
              const modsDeleted = await Module.deleteMany({ unitId: u._id });
              console.log(`  Deleted ${modsDeleted.deletedCount} modules from unit ${u.title}`);
          }
          const unitsDeleted = await Unit.deleteMany({ chapterId: ch._id });
          console.log(`  Deleted ${unitsDeleted.deletedCount} units from chapter.`);
          
          await Chapter.deleteOne({ _id: ch._id });
          console.log(`✅ Successfully completely deleted Chapter: ${ch.title}`);
      }
      
      if (chapters.length === 0) {
          console.log("⚠️ Not found in database.");
      }
  }

  console.log("\n🎉 Clean-up complete!");
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
