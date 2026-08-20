import mongoose from 'mongoose';
import { v2 as cloudinaryDest } from 'cloudinary';
import dotenv from 'dotenv';
import Board from './models/Board.js';
import ClassLevel from './models/ClassLevel.js';
import Subject from './models/Subject.js';
import Chapter from './models/Chapter.js';
import Unit from './models/Unit.js';
import Module from './models/Module.js';
import CurriculumItem from './models/CurriculumItem.js';

dotenv.config();

// Configure the Destination Cloudinary Account (3rd Server)
cloudinaryDest.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME_3,
  api_key: process.env.CLOUDINARY_API_KEY_3,
  api_secret: process.env.CLOUDINARY_API_SECRET_3,
});

const DEST_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME_3;

// Helper to check if URL needs migration (it's not already on the 3rd server)
const needsMigration = (url) => url && typeof url === 'string' && url.includes('res.cloudinary.com') && !url.includes(`res.cloudinary.com/${DEST_CLOUD_NAME}`);

// Helper to extract public_id from Cloudinary URL
function extractPublicId(url) {
  try {
    const parts = url.split('/upload/');
    if (parts.length !== 2) return null;
    let path = parts[1];
    if (path.match(/^v\d+\//)) {
      path = path.replace(/^v\d+\//, '');
    }
    const lastDotIndex = path.lastIndexOf('.');
    if (lastDotIndex !== -1) {
      path = path.substring(0, lastDotIndex);
    }
    return path;
  } catch (err) {
    return null;
  }
}

async function migrateAndReplaceUrl(oldUrl, dbUpdaterCallback) {
  const publicId = extractPublicId(oldUrl);
  if (!publicId) {
    console.log(`❌ Failed to extract public_id from ${oldUrl}`);
    return false;
  }

  try {
    const result = await cloudinaryDest.uploader.upload(oldUrl, {
      public_id: publicId,
      overwrite: true,
      invalidate: true
    });
    
    const newUrl = result.secure_url;
    console.log(`✅ Uploaded to 3rd server: ${newUrl}`);
    
    await dbUpdaterCallback(newUrl);
    return true;
  } catch (uploadErr) {
    console.error(`❌ Error uploading ${oldUrl} to 3rd server:`, uploadErr.message);
    return false;
  }
}

const migrateToServer3 = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // 1. Fetch relevant Boards and Classes
    const boardCBSE = await Board.findOne({ name: "CBSE" });
    const boardEduvate = await Board.findOne({ name: "Eduvate (CBSE)" });
    
    // There are multiple "6" classes in the DB, so we get all of them
    const classes6 = await ClassLevel.find({ name: "6" });
    const class6Ids = classes6.map(c => c._id);
    
    const class8 = await ClassLevel.findOne({ name: "8" });

    if (!boardCBSE || !boardEduvate || class6Ids.length === 0 || !class8) {
       throw new Error("One or more required Boards or Classes not found in DB.");
    }

    // 2. Identify the target subjects
    const targetSubjects = await Subject.find({
      $or: [
        { boardId: boardCBSE._id, classId: class8._id },
        { boardId: boardEduvate._id, classId: { $in: class6Ids } }
      ]
    });

    const subjectIds = targetSubjects.map(s => s._id);
    console.log(`Found ${targetSubjects.length} target subjects for Class 8 CBSE and Class 6 Eduvate.`);

    let successCount = 0;
    let failCount = 0;

    // Migrate Subject images
    for (const subject of targetSubjects) {
      if (needsMigration(subject.iconUrl)) {
        await migrateAndReplaceUrl(subject.iconUrl, async (newUrl) => {
          subject.iconUrl = newUrl;
          await subject.save();
        }) ? successCount++ : failCount++;
      }
      if (needsMigration(subject.bgUrl)) {
        await migrateAndReplaceUrl(subject.bgUrl, async (newUrl) => {
          subject.bgUrl = newUrl;
          await subject.save();
        }) ? successCount++ : failCount++;
      }
    }

    // Find Chapters
    const chapters = await Chapter.find({ subjectId: { $in: subjectIds } });
    const chapterIds = chapters.map(c => c._id);
    console.log(`Found ${chapters.length} chapters`);

    for (const chapter of chapters) {
      if (needsMigration(chapter.imageUrl)) {
        await migrateAndReplaceUrl(chapter.imageUrl, async (newUrl) => {
          chapter.imageUrl = newUrl;
          await chapter.save();
        }) ? successCount++ : failCount++;
      }
      if (needsMigration(chapter.bgUrl)) {
        await migrateAndReplaceUrl(chapter.bgUrl, async (newUrl) => {
          chapter.bgUrl = newUrl;
          await chapter.save();
        }) ? successCount++ : failCount++;
      }
    }

    // Find Units
    const units = await Unit.find({ chapterId: { $in: chapterIds } });
    console.log(`Found ${units.length} units`);
    
    for (const unit of units) {
      if (needsMigration(unit.headerBgUrl)) {
        await migrateAndReplaceUrl(unit.headerBgUrl, async (newUrl) => {
          unit.headerBgUrl = newUrl;
          await unit.save();
        }) ? successCount++ : failCount++;
      }
      if (needsMigration(unit.timelineBgUrl)) {
        await migrateAndReplaceUrl(unit.timelineBgUrl, async (newUrl) => {
          unit.timelineBgUrl = newUrl;
          await unit.save();
        }) ? successCount++ : failCount++;
      }
    }

    // Find Modules
    const modules = await Module.find({ chapterId: { $in: chapterIds } });
    const moduleIds = modules.map(m => m._id);
    console.log(`Found ${modules.length} modules`);

    // Find CurriculumItems
    const items = await CurriculumItem.find({ moduleId: { $in: moduleIds } });
    console.log(`Found ${items.length} curriculum items to inspect`);

    for (const item of items) {
      let modified = false;

      if (needsMigration(item.imageUrl)) {
        const success = await migrateAndReplaceUrl(item.imageUrl, async (newUrl) => {
          item.imageUrl = newUrl;
        });
        if (success) { modified = true; successCount++; } else failCount++;
      }

      if (item.images && item.images.length > 0) {
        for (let i = 0; i < item.images.length; i++) {
          const imgUrl = item.images[i];
          if (needsMigration(imgUrl)) {
            const success = await migrateAndReplaceUrl(imgUrl, async (newUrl) => {
              item.images[i] = newUrl;
            });
            if (success) { modified = true; successCount++; } else failCount++;
          }
        }
      }

      if (needsMigration(item.videoUrl)) {
         const success = await migrateAndReplaceUrl(item.videoUrl, async (newUrl) => {
           item.videoUrl = newUrl;
         });
         if (success) { modified = true; successCount++; } else failCount++;
      }

      if (modified) {
        await item.save();
      }
    }

    console.log(`\n--- Batch Migration to 3rd Server Complete ---`);
    console.log(`Total URLs successfully migrated and updated in DB: ${successCount}`);
    console.log(`Failed to migrate: ${failCount}`);

  } catch (err) {
    console.error('Fatal Error:', err);
  } finally {
    mongoose.disconnect();
    process.exit(0);
  }
};

migrateToServer3();
