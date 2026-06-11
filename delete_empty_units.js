import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: 'd:/hoshiyaar/hoshiyaar/Hoshiyaar-backend-main/.env' });

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const db = mongoose.connection.db;
    
    // Find all units named exactly "Unit"
    const genericUnits = await db.collection('units').find({ title: 'Unit' }).toArray();
    let deletedCount = 0;
    
    for (const u of genericUnits) {
      // Check if any modules are attached to this unit
      const moduleCount = await db.collection('modules').countDocuments({ unitId: u._id });
      if (moduleCount === 0) {
        console.log(`Deleting empty Unit (ID: ${u._id}) from Chapter ID: ${u.chapterId}`);
        await db.collection('units').deleteOne({ _id: u._id });
        deletedCount++;
      } else {
        console.log(`Keeping Unit (ID: ${u._id}) because it has ${moduleCount} modules.`);
      }
    }
    
    console.log(`\nOperation complete. Successfully deleted ${deletedCount} empty "Unit"s.`);
    
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
};

run();
