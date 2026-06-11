import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: 'd:/hoshiyaar/hoshiyaar/Hoshiyaar-backend-main/.env' });

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const db = mongoose.connection.db;
    const mods = await db.collection('modules').find({unitId: new mongoose.Types.ObjectId('6a22c465122d7d405f78065b')}).toArray();
    for(const m of mods){
      console.log(m.title, await db.collection('curriculumitems').countDocuments({moduleId: m._id}));
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
};
run();
