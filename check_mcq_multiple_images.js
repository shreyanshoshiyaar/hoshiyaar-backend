import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: 'd:/hoshiyaar/hoshiyaar/Hoshiyaar-backend-main/.env' });

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const db = mongoose.connection.db;
    const item = await db.collection('curriculumitems').findOne({type: 'multiple-choice', options: {$size: 0}, 'images.1': {$exists: true}});
    console.log(item);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
};
run();
