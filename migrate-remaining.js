import mongoose from 'mongoose';
import { v2 as cloudinaryDest } from 'cloudinary';
import dotenv from 'dotenv';
import CurriculumItem from './models/CurriculumItem.js';
import DefaultRevisionQuestion from './models/DefaultRevisionQuestion.js';

dotenv.config();

// Configure the Destination Cloudinary Account (3rd Server)
cloudinaryDest.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME_3,
  api_key: process.env.CLOUDINARY_API_KEY_3,
  api_secret: process.env.CLOUDINARY_API_SECRET_3,
});

const OLD_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME; // dcxlzfyfp
const DEST_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME_3; // w7rytq0k

// Helper to check if URL needs migration (it is on the 1st server)
const needsMigration = (url) => url && typeof url === 'string' && url.includes(`res.cloudinary.com/${OLD_CLOUD_NAME}`);

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
      invalidate: true,
      resource_type: "auto"
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

const migrateRemaining = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log(`Starting cleanup migration from Server 1 (${OLD_CLOUD_NAME}) to Server 3 (${DEST_CLOUD_NAME})...\n`);

    let successCount = 0;
    let failCount = 0;

    // 1. Migrate orphaned/remaining Curriculum Items
    const regex = new RegExp(`res\\.cloudinary\\.com/${OLD_CLOUD_NAME}`, 'i');
    const items = await CurriculumItem.find({
      $or: [{ imageUrl: { $regex: regex } }, { images: { $regex: regex } }, { videoUrl: { $regex: regex } }, { introVideoUrl: { $regex: regex } }]
    });

    console.log(`Found ${items.length} Curriculum Items to migrate...`);

    for (const item of items) {
      let modified = false;

      if (needsMigration(item.imageUrl)) {
        const success = await migrateAndReplaceUrl(item.imageUrl, async (newUrl) => { item.imageUrl = newUrl; });
        if (success) { modified = true; successCount++; } else failCount++;
      }

      if (item.images && item.images.length > 0) {
        for (let i = 0; i < item.images.length; i++) {
          if (needsMigration(item.images[i])) {
            const success = await migrateAndReplaceUrl(item.images[i], async (newUrl) => { item.images[i] = newUrl; });
            if (success) { modified = true; successCount++; } else failCount++;
          }
        }
      }

      if (needsMigration(item.videoUrl)) {
        const success = await migrateAndReplaceUrl(item.videoUrl, async (newUrl) => { item.videoUrl = newUrl; });
        if (success) { modified = true; successCount++; } else failCount++;
      }

      if (needsMigration(item.introVideoUrl)) {
        const success = await migrateAndReplaceUrl(item.introVideoUrl, async (newUrl) => { item.introVideoUrl = newUrl; });
        if (success) { modified = true; successCount++; } else failCount++;
      }

      if (modified) await item.save();
    }

    // 2. Migrate remaining Revision Questions
    const revisions = await DefaultRevisionQuestion.find({
      $or: [{ videoUrl: { $regex: regex } }, { introVideoUrl: { $regex: regex } }, { images: { $regex: regex } }]
    });

    console.log(`Found ${revisions.length} Revision Questions to migrate...`);

    for (const q of revisions) {
      let modified = false;

      if (q.images && q.images.length > 0) {
        for (let i = 0; i < q.images.length; i++) {
          if (needsMigration(q.images[i])) {
            const success = await migrateAndReplaceUrl(q.images[i], async (newUrl) => { q.images[i] = newUrl; });
            if (success) { modified = true; successCount++; } else failCount++;
          }
        }
      }

      if (needsMigration(q.videoUrl)) {
        const success = await migrateAndReplaceUrl(q.videoUrl, async (newUrl) => { q.videoUrl = newUrl; });
        if (success) { modified = true; successCount++; } else failCount++;
      }

      if (needsMigration(q.introVideoUrl)) {
        const success = await migrateAndReplaceUrl(q.introVideoUrl, async (newUrl) => { q.introVideoUrl = newUrl; });
        if (success) { modified = true; successCount++; } else failCount++;
      }

      if (modified) await q.save();
    }

    console.log(`\n--- Final Cleanup Migration Complete ---`);
    console.log(`Total URLs successfully migrated to Server 3: ${successCount}`);
    console.log(`Failed to migrate: ${failCount}`);

  } catch (err) {
    console.error('Fatal Error:', err);
  } finally {
    mongoose.disconnect();
    process.exit(0);
  }
};

migrateRemaining();
