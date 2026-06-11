import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: 'd:/hoshiyaar/hoshiyaar/Hoshiyaar-backend-main/.env' });

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const db = mongoose.connection.db;
    const ch = await db.collection('chapters').findOne({title: 'Chapter 2: Diversity in the Living World'});
    const units = await db.collection('units').find({chapterId: ch._id}).toArray();
    for(const u of units) {
      console.log('Unit ID:', u._id, '| Title:', JSON.stringify(u.title));
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
};
run();
