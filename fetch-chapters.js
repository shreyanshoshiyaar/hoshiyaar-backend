import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Board from './models/Board.js';
import ClassLevel from './models/ClassLevel.js';
import Subject from './models/Subject.js';
import Chapter from './models/Chapter.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log("✅ Connected to MongoDB.");

  const boards = await Board.find({ name: { $in: ['CBSE', /Eduvate/i] } });
  
  for (const board of boards) {
      console.log(`\n=========================================`);
      console.log(`🏫 BOARD: ${board.name}`);
      console.log(`=========================================`);
      
      const classes = await ClassLevel.find({ boardId: board._id, name: { $in: ['6', '7', '8'] } });
      
      for (const cls of classes) {
          console.log(`\n  📚 Class: ${cls.name}`);
          const subjects = await Subject.find({ boardId: board._id, classId: cls._id, name: 'Science' });
          
          for (const sub of subjects) {
              console.log(`    🧪 Subject: ${sub.name}`);
              const chapters = await Chapter.find({ subjectId: sub._id }).sort({ order: 1, title: 1 });
              
              if (chapters.length === 0) {
                  console.log("      (No chapters found)");
              }
              
              chapters.forEach(ch => {
                  console.log(`      ➡️ Chapter ${ch.order || '?'}: ${ch.title}`);
              });
          }
      }
  }

  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
