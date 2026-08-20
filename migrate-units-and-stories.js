import mongoose from 'mongoose';
import { v2 as cloudinaryDest } from 'cloudinary';
import dotenv from 'dotenv';
import Unit from './models/Unit.js';
import InteractiveStory from './models/InteractiveStory.js';

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

// Upload using resource_type: "auto" so audio and video files don't fail
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

const migrateUnitsAndStories = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    let successCount = 0;
    let failCount = 0;

    // 1. Migrate Units (timelineBgUrl)
    const units = await Unit.find({});
    console.log(`Found ${units.length} units to inspect for timelineBgUrl...`);
    
    for (const unit of units) {
      if (needsMigration(unit.timelineBgUrl)) {
        await migrateAndReplaceUrl(unit.timelineBgUrl, async (newUrl) => {
          unit.timelineBgUrl = newUrl;
          await unit.save();
        }) ? successCount++ : failCount++;
      }
    }

    // 2. Migrate Interactive Stories
    const stories = await InteractiveStory.find({});
    console.log(`Found ${stories.length} interactive stories to inspect for assets...`);

    for (const story of stories) {
      let modified = false;

      if (needsMigration(story.backgroundImg)) {
        const success = await migrateAndReplaceUrl(story.backgroundImg, async (newUrl) => {
          story.backgroundImg = newUrl;
        });
        if (success) { modified = true; successCount++; } else failCount++;
      }

      if (needsMigration(story.backgroundMusic)) {
        const success = await migrateAndReplaceUrl(story.backgroundMusic, async (newUrl) => {
          story.backgroundMusic = newUrl;
        });
        if (success) { modified = true; successCount++; } else failCount++;
      }

      // Check slides
      if (story.slides && story.slides.length > 0) {
        for (let i = 0; i < story.slides.length; i++) {
          if (needsMigration(story.slides[i].characterImg)) {
            const success = await migrateAndReplaceUrl(story.slides[i].characterImg, async (newUrl) => {
              story.slides[i].characterImg = newUrl;
            });
            if (success) { modified = true; successCount++; } else failCount++;
          }

          if (needsMigration(story.slides[i].audioUrl)) {
            const success = await migrateAndReplaceUrl(story.slides[i].audioUrl, async (newUrl) => {
              story.slides[i].audioUrl = newUrl;
            });
            if (success) { modified = true; successCount++; } else failCount++;
          }
        }
      }

      if (modified) {
        await story.save();
      }
    }

    console.log(`\n--- Units & Stories Migration Complete ---`);
    console.log(`Total URLs successfully migrated and updated in DB: ${successCount}`);
    console.log(`Failed to migrate: ${failCount}`);

  } catch (err) {
    console.error('Fatal Error:', err);
  } finally {
    mongoose.disconnect();
    process.exit(0);
  }
};

migrateUnitsAndStories();
