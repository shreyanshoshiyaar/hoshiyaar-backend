import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Board from './models/Board.js';
import ClassLevel from './models/ClassLevel.js';
import Subject from './models/Subject.js';
import Chapter from './models/Chapter.js';
import Unit from './models/Unit.js';
import Module from './models/Module.js';

dotenv.config();

async function fixTemperatureData() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB.");

    // 1. Find CBSE -> Class 6 -> Science
    const board = await Board.findOne({ name: 'CBSE' });
    if (!board) throw new Error("Board CBSE not found");
    
    const cls = await ClassLevel.findOne({ boardId: board._id, name: '6' });
    if (!cls) throw new Error("Class 6 not found");

    const subject = await Subject.findOne({ boardId: board._id, classId: cls._id, name: 'Science' });
    if (!subject) throw new Error("Science subject not found for Class 6");

    console.log(`✅ Found Target: CBSE -> Class 6 -> Science`);

    // 2. Find or create the definitive Chapter in Class 6
    let targetChapter = await Chapter.findOne({ subjectId: subject._id, title: /Temperature and its Measurement/i });
    if (!targetChapter) {
        targetChapter = await Chapter.findOne({ subjectId: subject._id, title: /Temperature/i });
    }
    if (!targetChapter) {
        targetChapter = await Chapter.create({ subjectId: subject._id, title: "Temperature and its Measurement", order: 6 });
        console.log(`Created new target chapter.`);
    } else {
        console.log(`✅ Found Target Chapter: ${targetChapter.title}`);
    }

    // 3. Find ALL units across the entire DB that look like Temperature units
    const allTempUnits = await Unit.find({ 
        $or: [
            { title: /Temperature & thermometer/i },
            { title: /Scales of temperature/i },
            { title: /Types of Thermometer/i },
            { chapterId: targetChapter._id }
        ]
    });

    console.log(`📦 Found ${allTempUnits.length} potential temperature units in DB.`);

    let movedUnits = 0;
    let movedModules = 0;

    for (const unit of allTempUnits) {
        // Skip dummy empty units
        const mods = await Module.find({ unitId: unit._id });
        if (mods.length === 0 && String(unit.chapterId) === String(targetChapter._id)) {
            await Unit.deleteOne({ _id: unit._id });
            console.log(`   🗑️ Deleted empty dummy unit: ${unit.title}`);
            continue;
        }

        // Move valid units to the target chapter
        if (String(unit.chapterId) !== String(targetChapter._id)) {
            unit.chapterId = targetChapter._id;
            await unit.save();
            movedUnits++;
        }

        // Make sure modules also point to the target chapter
        for (const mod of mods) {
            if (String(mod.chapterId) !== String(targetChapter._id)) {
                mod.chapterId = targetChapter._id;
                await mod.save();
                movedModules++;
            }
        }
    }

    console.log(`✅ Fixed ${movedUnits} Units and ${movedModules} Modules by moving them to Class 6 Science.`);

    // 4. Cleanup: Delete any OTHER chapters that have "Temperature" in the title but are now empty
    const otherTempChapters = await Chapter.find({ 
        title: /Temperature/i, 
        _id: { $ne: targetChapter._id } 
    });

    for (const ch of otherTempChapters) {
        const remainingUnits = await Unit.countDocuments({ chapterId: ch._id });
        if (remainingUnits === 0) {
            await Chapter.deleteOne({ _id: ch._id });
            console.log(`   🗑️ Cleaned up empty old chapter: ${ch.title}`);
        }
    }

    console.log(`\n🎉 Success! All Temperature data is now firmly in Class 6!`);
    console.log(`IMPORTANT: Remember to clear your browser session storage or use Incognito to see the changes!`);

  } catch (error) {
    console.error("❌ Error fixing data:", error);
  } finally {
    mongoose.connection.close();
    process.exit(0);
  }
}

fixTemperatureData();
