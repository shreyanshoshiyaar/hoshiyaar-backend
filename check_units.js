import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: 'd:/hoshiyaar/hoshiyaar/Hoshiyaar-backend-main/.env' });

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;
  const units = await db.collection('units').find({ title: /Plant Characteristics|Animal Movement/ }).toArray();
  console.log('Units:', units.map(u => ({ title: u.title, id: u._id })));
  for(const u of units) {
    const count = await db.collection('defaultrevisionquestions').countDocuments({ unitId: u._id });
    console.log('Count for', u.title, ':', count);
    
    // Fallback: check if the object id is stored as string or objectid
    const countStr = await db.collection('defaultrevisionquestions').countDocuments({ unitId: String(u._id) });
    console.log('Count for', u.title, '(as string):', countStr);
  }
  process.exit(0);
};
run();
