import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: 'd:/hoshiyaar/hoshiyaar/Hoshiyaar-backend-main/.env' });

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const db = mongoose.connection.db;
    const mods = await db.collection('modules').find({ title: /difficult module/i }).toArray();
    for (const m of mods) {
      const ch = await db.collection('chapters').findOne({_id: m.chapterId});
      const un = await db.collection('units').findOne({_id: m.unitId});
      const items = await db.collection('curriculumitems').countDocuments({moduleId: m._id});
      console.log(`Found: ${ch ? ch.title : 'null'} -> ${un ? un.title : 'null'} | Items: ${items} | Module ID: ${m._id}`);
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
};
run();
