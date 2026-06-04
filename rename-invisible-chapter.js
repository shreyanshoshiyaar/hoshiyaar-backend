import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Board from './models/Board.js';
import ClassLevel from './models/ClassLevel.js';
import Subject from './models/Subject.js';
import Chapter from './models/Chapter.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

async function renameChapter() {
  await mongoose.connect(MONGO_URI);
  console.log("✅ Connected to MongoDB.");

  const board = await Board.findOne({ name: 'CBSE' });
  const classLevel = await ClassLevel.findOne({ boardId: board._id, name: '8' });
  const subject = await Subject.findOne({ boardId: board._id, classId: classLevel._id, name: 'Science' });

  // Find any chapter containing "Invisible" in CBSE Class 8 Science
  const chapter = await Chapter.findOne({ 
      subjectId: subject._id, 
      title: { $regex: /Invisible/i } 
  });

  if (chapter) {
      console.log(`Found chapter: "${chapter.title}"`);
      const newName = "Chapter 2: The Invisible Living World -  Beyond Our Naked Eye";
      chapter.title = newName;
      await chapter.save();
      console.log(`✅ Renamed chapter to: "${newName}"`);
  } else {
      console.log("❌ Could not find the Invisible World chapter in CBSE Class 8 Science.");
  }

  process.exit(0);
}

renameChapter().catch(console.error);
