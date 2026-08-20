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

const migrateExamConfigs = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    let successCount = 0;
    let failCount = 0;

    // Find all Exam Configurations in SystemSettings
    const configs = await SystemSettings.find({ key: { $regex: /^exam_config_/ } });
    console.log(`Found ${configs.length} Exam Configuration documents.`);

    for (const config of configs) {
      let modified = false;

      // The actual data is inside config.value
      // We must make a deep copy or use markModified since it's Mixed type
      const configValue = config.value || {};
      const revisionCards = configValue.revisionCards || [];

      for (let i = 0; i < revisionCards.length; i++) {
        const imgUrl = revisionCards[i];
        if (needsMigration(imgUrl)) {
          const success = await migrateAndReplaceUrl(imgUrl, async (newUrl) => {
            revisionCards[i] = newUrl;
          });
          if (success) { 
            modified = true; 
            successCount++; 
          } else {
            failCount++;
          }
        }
      }

      if (modified) {
        config.value = { ...configValue, revisionCards }; // Ensure reference changes
        config.markModified('value');
        await config.save();
      }
    }

    console.log(`\n--- Exam Configs Migration Complete ---`);
    console.log(`Total URLs successfully migrated and updated in DB: ${successCount}`);
    console.log(`Failed to migrate: ${failCount}`);

  } catch (err) {
    console.error('Fatal Error:', err);
  } finally {
    mongoose.disconnect();
    process.exit(0);
  }
};

migrateExamConfigs();
