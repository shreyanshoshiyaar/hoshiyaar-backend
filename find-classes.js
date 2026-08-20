import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Board from './models/Board.js';
import ClassLevel from './models/ClassLevel.js';

dotenv.config();

const findActualText = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB.\n');

    const boards = await Board.find({});
    console.log('--- BOARDS IN DATABASE ---');
    boards.forEach(b => console.log(`- "${b.name}"`));
    console.log('');

    const classes = await ClassLevel.find({});
    console.log('--- CLASSES IN DATABASE ---');
    classes.forEach(c => console.log(`- "${c.name}"`));
    console.log('');

  } catch (err) {
    console.error('Error connecting to DB:', err);
  } finally {
    mongoose.disconnect();
    process.exit(0);
  }
};

findActualText();
