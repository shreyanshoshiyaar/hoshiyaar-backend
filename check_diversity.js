import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: 'd:/hoshiyaar/hoshiyaar/Hoshiyaar-backend-main/.env' });

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const db = mongoose.connection.db;
    
    // Find Chapter
    const chapter = await db.collection('chapters').findOne({ title: 'Chapter 2: Diversity in the Living World' });
    if (!chapter) throw new Error("Chapter not found");
    
    // Get Units
    const units = await db.collection('units').find({ chapterId: chapter._id }).toArray();
    
    for (const unit of units) {
      console.log(`\nUnit: ${unit.title}`);
      const modules = await db.collection('modules').find({ unitId: unit._id }).toArray();
      for (const mod of modules) {
        const count = await db.collection('curriculumitems').countDocuments({ moduleId: mod._id });
        console.log(`  - Module: "${mod.title}" (Items: ${count})`);
      }
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
};

run();
