import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: 'd:/hoshiyaar/hoshiyaar/Hoshiyaar-backend-main/.env' });

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const db = mongoose.connection.db;
    const mods = await db.collection('modules').find().sort({_id:-1}).limit(10).toArray();
    console.log(mods.map(m=>({title:m.title, unitId:m.unitId})));
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
};
run();
