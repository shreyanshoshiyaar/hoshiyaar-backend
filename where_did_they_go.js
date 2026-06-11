import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: 'd:/hoshiyaar/hoshiyaar/Hoshiyaar-backend-main/.env' });

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const db = mongoose.connection.db;
    const items = await db.collection('curriculumitems').find().sort({_id:-1}).limit(1).toArray();
    if(items.length > 0) {
      const moduleId = items[0].moduleId;
      const mod = await db.collection('modules').findOne({_id: moduleId});
      console.log('Module Title:', mod.title);
      console.log('Module ID:', mod._id);
      console.log('Unit ID:', mod.unitId);
      console.log('Chapter ID:', mod.chapterId);
      
      const unit = await db.collection('units').findOne({_id: mod.unitId});
      console.log('Unit Title:', unit ? unit.title : 'None');
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
};
run();
