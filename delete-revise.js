import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Module from './models/Module.js';
import Chapter from './models/Chapter.js';
import CurriculumItem from './models/CurriculumItem.js';

dotenv.config();

async function deleteReviseModules() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB.");

    const chapter = await Chapter.findOne({ title: /Temperature and its Measurement/i });
    if (!chapter) {
        console.log("❌ Chapter not found!");
        process.exit(1);
    }
    
    // Find all modules in this chapter that have "Revise" or "Revision" in their title
    const mods = await Module.find({ chapterId: chapter._id });
    let deletedCount = 0;

    for (const m of mods) {
        if (m.title.toLowerCase().includes('revise') || m.title.toLowerCase().includes('revision')) {
            console.log(`🗑️ Deleting explicit Revise module: ${m.title}`);
            
            // Delete all items inside it first
            await CurriculumItem.deleteMany({ moduleId: m._id });
            
            // Delete the module itself
            await Module.deleteOne({ _id: m._id });
            deletedCount++;
        }
    }

    if (deletedCount === 0) {
        console.log("No explicit 'Revise' modules found in the database. If you still see it, it's just the auto-generated Revision Star in the UI!");
    } else {
        console.log(`\n🎉 Successfully deleted ${deletedCount} explicit Revise module(s)!`);
        console.log(`The UI will now only show the single auto-generated Revision Star at the end of the unit.`);
    }

  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    mongoose.connection.close();
    process.exit(0);
  }
}

deleteReviseModules();
