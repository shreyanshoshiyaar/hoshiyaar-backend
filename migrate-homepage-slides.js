import mongoose from 'mongoose';
import { v2 as cloudinaryDest } from 'cloudinary';
import dotenv from 'dotenv';
import SystemSettings from './models/SystemSettings.js';

dotenv.config();

// Configure the Destination Cloudinary Account (3rd Server)
cloudinaryDest.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME_3,
  api_key: process.env.CLOUDINARY_API_KEY_3,
  api_secret: process.env.CLOUDINARY_API_SECRET_3,
});

const DEST_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME_3;

// Helper to check if URL needs migration
const needsMigration = (url) => url && typeof url === 'string' && url.includes('res.cloudinary.com') && !url.includes(`res.cloudinary.com/${DEST_CLOUD_NAME}`);

// Helper to extract public_id
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
  if (!publicId) return false;

  try {
    const result = await cloudinaryDest.uploader.upload(oldUrl, {
      public_id: publicId,
      overwrite: true,
      invalidate: true,
      resource_type: "auto"
    });
    
    await dbUpdaterCallback(result.secure_url);
    console.log(`✅ Uploaded to 3rd server: ${result.secure_url}`);
    return true;
  } catch (uploadErr) {
    console.error(`❌ Error uploading ${oldUrl} to 3rd server:`, uploadErr.message);
    return false;
  }
}

const migrateHomepageSlides = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    let successCount = 0;
    let failCount = 0;

    const setting = await SystemSettings.findOne({ key: 'homepage_slides' });
    if (!setting || !Array.isArray(setting.value)) {
      console.log('No homepage slides found in DB to migrate.');
      process.exit(0);
    }

    let modified = false;
    let newSlides = [...setting.value];

    for (let i = 0; i < newSlides.length; i++) {
      const url = newSlides[i];
      if (needsMigration(url)) {
        const success = await migrateAndReplaceUrl(url, async (newUrl) => {
          newSlides[i] = newUrl;
        });
        if (success) { modified = true; successCount++; } else failCount++;
      }
    }

    if (modified) {
      setting.value = newSlides;
      setting.markModified('value');
      await setting.save();
    }

    console.log(`\n--- Homepage Slides Migration Complete ---`);
    console.log(`Successfully migrated: ${successCount}`);
    console.log(`Failed to migrate: ${failCount}`);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    mongoose.disconnect();
    process.exit(0);
  }
};

migrateHomepageSlides();
