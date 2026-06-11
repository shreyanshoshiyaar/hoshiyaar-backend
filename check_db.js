import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;
  const count = await db.collection('defaultrevisionquestions').countDocuments();
  console.log('Total DefaultRevisionQuestions:', count);
  process.exit(0);
};
run();
