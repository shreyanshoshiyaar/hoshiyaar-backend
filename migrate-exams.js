import mongoose from 'mongoose';
import { v2 as cloudinaryDest } from 'cloudinary';
import dotenv from 'dotenv';
import DefaultRevisionQuestion from './models/DefaultRevisionQuestion.js';

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
      invalidate: true,
      resource_type: "auto" // Auto detects images vs videos
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

const migrateExams = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    let successCount = 0;
    let failCount = 0;

    // Migrate DefaultRevisionQuestion
    const questions = await DefaultRevisionQuestion.find({});
    console.log(`Found ${questions.length} revision/exam questions to inspect for assets...`);

    for (const q of questions) {
      let modified = false;

      // Arrays (images)
      if (q.images && q.images.length > 0) {
        for (let i = 0; i < q.images.length; i++) {
          const imgUrl = q.images[i];
          if (needsMigration(imgUrl)) {
            const success = await migrateAndReplaceUrl(imgUrl, async (newUrl) => {
              q.images[i] = newUrl;
            });
            if (success) { modified = true; successCount++; } else failCount++;
          }
        }
      }

      // Strings (videoUrl, introVideoUrl)
      if (needsMigration(q.videoUrl)) {
        const success = await migrateAndReplaceUrl(q.videoUrl, async (newUrl) => {
          q.videoUrl = newUrl;
        });
        if (success) { modified = true; successCount++; } else failCount++;
      }

      if (needsMigration(q.introVideoUrl)) {
        const success = await migrateAndReplaceUrl(q.introVideoUrl, async (newUrl) => {
          q.introVideoUrl = newUrl;
        });
        if (success) { modified = true; successCount++; } else failCount++;
      }

      if (modified) {
        await q.save();
      }
    }

    console.log(`\n--- Exams/Revision Migration Complete ---`);
    console.log(`Total URLs successfully migrated and updated in DB: ${successCount}`);
    console.log(`Failed to migrate: ${failCount}`);

  } catch (err) {
    console.error('Fatal Error:', err);
  } finally {
    mongoose.disconnect();
    process.exit(0);
  }
};

migrateExams();
