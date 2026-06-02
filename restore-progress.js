import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import Module from './models/Module.js';
import Chapter from './models/Chapter.js';
import Subject from './models/Subject.js';

dotenv.config();

async function restoreProgress() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB.");

    // Find the user (case-insensitive search for AKSHITRAVULA)
    const user = await User.findOne({ 
        $or: [
            { username: { $regex: /akshitravula/i } },
            { name: { $regex: /akshitravula/i } }
        ]
    });

    if (!user) {
        console.log("❌ Could not find user AKSHITRAVULA");
        process.exit(1);
    }
    console.log(`✅ Found user: ${user.username || user.name}`);

    // Get all modules in the database
    const allModules = await Module.find({});
    console.log(`📦 Found ${allModules.length} modules to mark as completed.`);

    // Pre-fetch all chapters and subjects to map them quickly
    const chapters = await Chapter.find({});
    const subjects = await Subject.find({});
    
    let addedCount = 0;

    for (const mod of allModules) {
        const chapter = chapters.find(c => String(c._id) === String(mod.chapterId));
        if (!chapter) continue;

        const subject = subjects.find(s => String(s._id) === String(chapter.subjectId));
        if (!subject) continue;

        const chapterOrder = chapter.order || 1;
        const subjectName = subject.name;
        const modIdStr = String(mod._id);

        // Find the progress entry for this chapter & subject
        let progressIdx = user.chaptersProgress.findIndex(
            cp => cp.chapter === chapterOrder && cp.subject === subjectName
        );

        // If it doesn't exist, create it
        if (progressIdx === -1) {
            user.chaptersProgress.push({
                chapter: chapterOrder,
                subject: subjectName,
                completedModules: []
            });
            progressIdx = user.chaptersProgress.length - 1;
        }

        // Add the module ID if not already there
        if (!user.chaptersProgress[progressIdx].completedModules) {
            user.chaptersProgress[progressIdx].completedModules = [];
        }

        if (!user.chaptersProgress[progressIdx].completedModules.includes(modIdStr)) {
            user.chaptersProgress[progressIdx].completedModules.push(modIdStr);
            addedCount++;
        }
    }

    await user.save();
    console.log(`🎉 Success! Marked ${addedCount} modules as completed for ${user.username || user.name}.`);
    
  } catch (error) {
    console.error("❌ Error restoring progress:", error);
  } finally {
    mongoose.connection.close();
    process.exit(0);
  }
}

restoreProgress();
