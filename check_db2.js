import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: 'd:/hoshiyaar/hoshiyaar/Hoshiyaar-backend-main/.env' });

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;
  const count = await db.collection('defaultrevisionquestions').countDocuments();
  console.log('Total DefaultRevisionQuestions:', count);
  const docs = await db.collection('defaultrevisionquestions').find({}).toArray();
  console.log('Docs length:', docs.length);
  if(docs.length > 0) {
    console.log('Sample docs:', JSON.stringify(docs.slice(0, 5).map(d => ({ unitId: d.unitId, chapterId: d.chapterId, question: d.question })), null, 2));
  }
  process.exit(0);
};
run();
