import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: 'd:/hoshiyaar/hoshiyaar/Hoshiyaar-backend-main/.env' });

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;
  
  const boards = await db.collection('boards').find({}).toArray();
  const board = boards.find(b => b.name === 'Eduvate (CBSE)');
  
  if (board) {
    const res = await db.collection('classlevels').deleteMany({ boardId: board._id, name: '7' });
    console.log(`Deleted ${res.deletedCount} '7' class levels from Eduvate (CBSE).`);
  } else {
    console.log("Eduvate (CBSE) board not found.");
  }
  
  process.exit(0);
};

run();
