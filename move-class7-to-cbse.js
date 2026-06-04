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

  // Get CBSE Board + Class 7 + Science
  const cbseBoard = await Board.findOne({ name: 'CBSE' });
  let cbseClass7 = await ClassLevel.findOne({ boardId: cbseBoard._id, name: '7' });
  if (!cbseClass7) {
      cbseClass7 = await ClassLevel.create({ boardId: cbseBoard._id, name: '7', description: 'Class 7' });
  }
  let cbseScience = await Subject.findOne({ boardId: cbseBoard._id, classId: cbseClass7._id, name: 'Science' });
  if (!cbseScience) {
      cbseScience = await Subject.create({ boardId: cbseBoard._id, classId: cbseClass7._id, name: 'Science', description: 'Science for Class 7' });
  }

  // Get Eduvate Board + Class 7 + Science
  const eduvateBoard = await Board.findOne({ name: /Eduvate/i });
  if (eduvateBoard) {
      const eduvateClass7 = await ClassLevel.findOne({ boardId: eduvateBoard._id, name: '7' });
      if (eduvateClass7) {
          const eduvateScience = await Subject.findOne({ boardId: eduvateBoard._id, classId: eduvateClass7._id, name: 'Science' });
          if (eduvateScience) {
              // Move all chapters from Eduvate Class 7 Science to CBSE Class 7 Science
              const result = await Chapter.updateMany(
                  { subjectId: eduvateScience._id },
                  { $set: { subjectId: cbseScience._id } }
              );
              console.log(`✅ Successfully moved ${result.modifiedCount} chapters to CBSE Class 7!`);
          }
      }
  }

  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
