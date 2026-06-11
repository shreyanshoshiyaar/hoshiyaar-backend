import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: 'd:/hoshiyaar/hoshiyaar/Hoshiyaar-backend-main/.env' });

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const db = mongoose.connection.db;
    const item = await db.collection('curriculumitems').findOne({text: 'This is a test concept'});
    console.log('Module ID:', item.moduleId);
    const mod = await db.collection('modules').findOne({_id: item.moduleId});
    console.log('Module:', mod);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
};
run();
