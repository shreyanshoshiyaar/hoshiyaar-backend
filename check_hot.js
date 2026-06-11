import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: 'd:/hoshiyaar/hoshiyaar/Hoshiyaar-backend-main/.env' });

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const db = mongoose.connection.db;
    
    // Find modules with 'hot' or 'difficult' in title
    const modules = await db.collection('modules').find({
      title: { $regex: /(hot|difficult)/i }
    }).toArray();
    
    for (const mod of modules) {
      // Find chapter and unit
      const chapter = await db.collection('chapters').findOne({ _id: mod.chapterId });
      const unit = await db.collection('units').findOne({ _id: mod.unitId });
      
      const itemCount = await db.collection('curriculumitems').countDocuments({ moduleId: mod._id });
      
      console.log(`Module: "${mod.title}" (ID: ${mod._id})`);
      console.log(`  - Chapter: ${chapter ? chapter.title : 'None'}`);
      console.log(`  - Unit: ${unit ? unit.title : 'None'}`);
      console.log(`  - Items: ${itemCount}`);
    }
    
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
};

run();
