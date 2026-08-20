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

// Configure the Destination Cloudinary Account
cloudinaryDest.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME_2,
  api_key: process.env.CLOUDINARY_API_KEY_2,
  api_secret: process.env.CLOUDINARY_API_SECRET_2,
});

const OLD_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const NEW_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME_2;

// Helper to check if URL is from old Cloudinary
const isOldCloudinaryUrl = (url) => url && url.includes(`res.cloudinary.com/${OLD_CLOUD_NAME}`);

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
    console.log(`✅ Uploaded to new account: ${newUrl}`);
    
    await dbUpdaterCallback(newUrl);
    return true;
  } catch (uploadErr) {
    console.error(`❌ Error uploading ${oldUrl} to new account:`, uploadErr.message);
    return false;
  }
}

const migrateCbse67 = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const board = await Board.findOne({ name: "CBSE" });
    if (!board) throw new Error("CBSE Board not found");

    const classes = await ClassLevel.find({ name: { $in: ["6", "7"] } });
    if (!classes.length) {
      throw new Error("Classes '6' and '7' not found");
    }

    const classIds = classes.map(c => c._id);
    
    // Find Subjects
    const subjects = await Subject.find({ boardId: board._id, classId: { $in: classIds } });
    const subjectIds = subjects.map(s => s._id);
    console.log(`Found ${subjects.length} subjects for CBSE Class 6 and 7`);

    let successCount = 0;
    let failCount = 0;

    // Migrate Subject images
    for (const subject of subjects) {
      if (isOldCloudinaryUrl(subject.iconUrl)) {
        await migrateAndReplaceUrl(subject.iconUrl, async (newUrl) => {
          subject.iconUrl = newUrl;
          await subject.save();
        }) ? successCount++ : failCount++;
      }
      if (isOldCloudinaryUrl(subject.bgUrl)) {
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
      if (isOldCloudinaryUrl(chapter.imageUrl)) {
        await migrateAndReplaceUrl(chapter.imageUrl, async (newUrl) => {
          chapter.imageUrl = newUrl;
          await chapter.save();
        }) ? successCount++ : failCount++;
      }
      if (isOldCloudinaryUrl(chapter.bgUrl)) {
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
      if (isOldCloudinaryUrl(unit.headerBgUrl)) {
        await migrateAndReplaceUrl(unit.headerBgUrl, async (newUrl) => {
          unit.headerBgUrl = newUrl;
          await unit.save();
        }) ? successCount++ : failCount++;
      }
      if (isOldCloudinaryUrl(unit.timelineBgUrl)) {
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
    // Modules don't have images natively in Hoshiyaar schema, but if they do, we'd add here.

    // Find CurriculumItems
    const items = await CurriculumItem.find({ moduleId: { $in: moduleIds } });
    console.log(`Found ${items.length} curriculum items to inspect`);

    for (const item of items) {
      let modified = false;

      if (isOldCloudinaryUrl(item.imageUrl)) {
        const success = await migrateAndReplaceUrl(item.imageUrl, async (newUrl) => {
          item.imageUrl = newUrl;
        });
        if (success) { modified = true; successCount++; } else failCount++;
      }

      if (item.images && item.images.length > 0) {
        for (let i = 0; i < item.images.length; i++) {
          const imgUrl = item.images[i];
          if (isOldCloudinaryUrl(imgUrl)) {
            const success = await migrateAndReplaceUrl(imgUrl, async (newUrl) => {
              item.images[i] = newUrl;
            });
            if (success) { modified = true; successCount++; } else failCount++;
          }
        }
      }

      // Also migrate videoUrl if it happens to be hosted on old cloudinary? (optional, usually images)
      if (isOldCloudinaryUrl(item.videoUrl)) {
         const success = await migrateAndReplaceUrl(item.videoUrl, async (newUrl) => {
           item.videoUrl = newUrl;
         });
         if (success) { modified = true; successCount++; } else failCount++;
      }

      if (modified) {
        await item.save();
      }
    }

    console.log(`\n--- Batch Migration Complete ---`);
    console.log(`Total URLs successfully migrated and updated in DB: ${successCount}`);
    console.log(`Failed to migrate: ${failCount}`);

  } catch (err) {
    console.error('Fatal Error:', err);
  } finally {
    mongoose.disconnect();
    process.exit(0);
  }
};

migrateCbse67();
