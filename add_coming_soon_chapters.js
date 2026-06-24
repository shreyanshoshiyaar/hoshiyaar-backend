import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Board from './models/Board.js';
import ClassLevel from './models/ClassLevel.js';
import Subject from './models/Subject.js';
import Chapter from './models/Chapter.js';

dotenv.config();

async function addComingSoonChapters() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB.");

    const board = await Board.findOne({ name: 'CBSE' });
    if (!board) throw new Error("Board CBSE not found");

    const cls = await ClassLevel.findOne({ boardId: board._id, name: '6' });
    if (!cls) throw new Error("Class 6 not found");

    const subject = await Subject.findOne({ classId: cls._id, name: 'Science' });
    if (!subject) throw new Error("Science subject not found in Class 6");

    const chaptersToAdd = [
      { order: 5, baseTitle: 'Measurement of Length and Motion' },
      { order: 6, baseTitle: 'Materials Around Us' },
      { order: 7, baseTitle: 'Temperature and its Measurement' },
      { order: 8, baseTitle: 'A Journey through States of Water' }
    ];

    for (let ch of chaptersToAdd) {
      const fullTitle = `${ch.baseTitle} (Coming Soon)`;
      
      // Try to find if chapter exists by base title (ignoring case/suffix)
      const existingByTitle = await Chapter.findOne({ 
        subjectId: subject._id, 
        title: { $regex: `^${ch.baseTitle}`, $options: 'i' } 
      });

      if (existingByTitle) {
        existingByTitle.title = fullTitle;
        existingByTitle.order = ch.order;
        await existingByTitle.save();
        console.log(`Updated existing chapter to: ${fullTitle}`);
      } else {
        await Chapter.create({
          subjectId: subject._id,
          title: fullTitle,
          order: ch.order
        });
        console.log(`Created new chapter: ${fullTitle}`);
      }
    }

    console.log("All 'Coming Soon' chapters processed successfully!");

  } catch (error) {
    console.error("Error adding chapters:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected.");
  }
}

addComingSoonChapters();
