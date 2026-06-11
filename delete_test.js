import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: 'd:/hoshiyaar/hoshiyaar/Hoshiyaar-backend-main/.env' });

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const db = mongoose.connection.db;
    const mod = await db.collection('modules').findOne({title: 'Difficult Module TEST'});
    if(mod) {
      await db.collection('curriculumitems').deleteMany({moduleId: mod._id});
      await db.collection('modules').deleteOne({_id: mod._id});
      console.log('Deleted TEST module');
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
};
run();
