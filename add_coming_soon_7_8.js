import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Board from './models/Board.js';
import ClassLevel from './models/ClassLevel.js';
import Subject from './models/Subject.js';
import Chapter from './models/Chapter.js';

dotenv.config();

async function addComingSoonChapters78() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB.");

    const board = await Board.findOne({ name: 'CBSE' });
    if (!board) throw new Error("Board CBSE not found");

    // Helper to ensure Class and Subject exist, then add chapters
    async function processClassAndChapters(className, chaptersToAdd) {
      let cls = await ClassLevel.findOne({ boardId: board._id, name: className });
      if (!cls) {
        console.log(`Class ${className} not found. Creating...`);
        cls = await ClassLevel.create({ boardId: board._id, name: className, description: `Class ${className}` });
      }

      let subject = await Subject.findOne({ classId: cls._id, name: 'Science' });
      if (!subject) {
        console.log(`Science subject not found in Class ${className}. Creating...`);
        subject = await Subject.create({ boardId: board._id, classId: cls._id, name: 'Science', description: `Science for Class ${className}` });
      }

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
          console.log(`[Class ${className}] Updated existing chapter to: ${fullTitle}`);
        } else {
          // Check by order
          const existingByOrder = await Chapter.findOne({ subjectId: subject._id, order: ch.order });
          if (existingByOrder) {
            existingByOrder.title = fullTitle;
            await existingByOrder.save();
            console.log(`[Class ${className}] Updated chapter ${ch.order} title to: ${fullTitle}`);
          } else {
            await Chapter.create({
              subjectId: subject._id,
              title: fullTitle,
              order: ch.order
            });
            console.log(`[Class ${className}] Created new chapter: ${fullTitle}`);
          }
        }
      }
    }

    const class7Chapters = [
      { order: 5, baseTitle: 'Changes Around Us: Physical and Chemical' },
      { order: 6, baseTitle: 'Adolescence: A Stage of Growth and Change' },
      { order: 7, baseTitle: 'Heat Transfer in Nature' },
      { order: 8, baseTitle: 'Measurement of Time and Motion' }
    ];

    const class8Chapters = [
      { order: 5, baseTitle: 'Exploring Forces' },
      { order: 6, baseTitle: 'Pressure, Winds, Storms, and Cyclones' },
      { order: 7, baseTitle: 'Particulate Nature of Matter' },
      { order: 8, baseTitle: 'Nature of Matter: Elements, Compounds, and Mixtures' }
    ];

    console.log("Processing Class 7...");
    await processClassAndChapters('7', class7Chapters);

    console.log("Processing Class 8...");
    await processClassAndChapters('8', class8Chapters);

    console.log("All 'Coming Soon' chapters processed successfully!");

  } catch (error) {
    console.error("Error adding chapters:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected.");
  }
}

addComingSoonChapters78();
