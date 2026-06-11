import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: 'd:/hoshiyaar/hoshiyaar/Hoshiyaar-backend-main/.env' });

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const db = mongoose.connection.db;
    
    // Find CBSE board
    const board = await db.collection('boards').findOne({ name: 'CBSE' });
    if (!board) throw new Error("CBSE board not found");
    
    // Find Class 7
    const classLevel = await db.collection('classlevels').findOne({ boardId: board._id, name: '7' });
    if (!classLevel) throw new Error("Class 7 not found");
    
    // Find Science
    const subject = await db.collection('subjects').findOne({ classId: classLevel._id, name: 'Science' });
    if (!subject) throw new Error("Science subject not found");
    
    // Get Chapters
    const chapters = await db.collection('chapters').find({ subjectId: subject._id }).toArray();
    
    // Sort by Chapter number
    chapters.sort((a, b) => {
      const numA = parseInt(a.title.match(/Chapter\s+(\d+)/i)?.[1] || "0", 10);
      const numB = parseInt(b.title.match(/Chapter\s+(\d+)/i)?.[1] || "0", 10);
      return numA - numB;
    });
    
    // Update order
    for (let i = 0; i < chapters.length; i++) {
      await db.collection('chapters').updateOne(
        { _id: chapters[i]._id },
        { $set: { order: i + 1 } }
      );
      console.log(`Updated '${chapters[i].title}' to order ${i + 1}`);
    }
    
    console.log("Successfully reordered chapters numerically.");
    
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
};

run();
