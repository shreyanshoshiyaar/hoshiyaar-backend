import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Chapter from './models/Chapter.js';
import Unit from './models/Unit.js';
import Module from './models/Module.js';

dotenv.config();

async function mergeChapters() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB.");

    // Find the original Chapter 6
    const oldChapter = await Chapter.findOne({ title: { $regex: /Chapter 6.*Temperature/i } });
    if (!oldChapter) {
        console.log("❌ Could not find 'Chapter 6: Temperature And Thermometer'.");
        process.exit(1);
    }
    console.log(`✅ Found original Chapter 6: ${oldChapter.title} (ID: ${oldChapter._id})`);

    // Find the new one we just created (Chapter 7)
    const newChapter = await Chapter.findOne({ title: /^Temperature And Thermometer$/i });
    if (!newChapter) {
        console.log("❌ Could not find the newly created 'Temperature And Thermometer' chapter. Did it already get merged?");
        process.exit(1);
    }
    console.log(`✅ Found new Chapter: ${newChapter.title} (ID: ${newChapter._id})`);

    // Move all units from newChapter -> oldChapter
    const unitsToMove = await Unit.find({ chapterId: newChapter._id });
    for (const unit of unitsToMove) {
        unit.chapterId = oldChapter._id;
        await unit.save();
        console.log(`   ➡️ Moved Unit: ${unit.title}`);

        // Also update all modules in this unit to point to the new chapter
        const modulesToUpdate = await Module.find({ unitId: unit._id });
        for (const mod of modulesToUpdate) {
            mod.chapterId = oldChapter._id;
            await mod.save();
        }
    }

    // Delete the new chapter (Chapter 7)
    await Chapter.deleteOne({ _id: newChapter._id });
    console.log(`🗑️ Deleted the duplicate Chapter 7.`);

    console.log(`🎉 Success! All data has been successfully moved into 'Chapter 6: Temperature And Thermometer'.`);
    
  } catch (error) {
    console.error("❌ Error merging chapters:", error);
  } finally {
    mongoose.connection.close();
    process.exit(0);
  }
}

mergeChapters();
