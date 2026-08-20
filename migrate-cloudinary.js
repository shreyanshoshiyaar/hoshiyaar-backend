import mongoose from 'mongoose';
import { v2 as cloudinaryDest } from 'cloudinary';
import dotenv from 'dotenv';
import CurriculumItem from './models/CurriculumItem.js';
import Unit from './models/Unit.js';
import Chapter from './models/Chapter.js';
import Subject from './models/Subject.js';
import Blog from './models/Blog.js';
import InteractiveStory from './models/InteractiveStory.js';

dotenv.config();

// Configure the Destination Cloudinary Account
cloudinaryDest.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME_2,
  api_key: process.env.CLOUDINARY_API_KEY_2,
  api_secret: process.env.CLOUDINARY_API_SECRET_2,
});

const OLD_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const NEW_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME_2;

// The list of specific old URLs to migrate
const IMAGES_TO_MIGRATE = [
  "https://res.cloudinary.com/dcxlzfyfp/image/upload/v1780486939/img-to-link/c0rp7vrmcwotyvvzzik9.webp"
];

// Helper to extract public_id from Cloudinary URL
function extractPublicId(url) {
  try {
    // Example: https://res.cloudinary.com/cloud_name/image/upload/v1234567/folder/file.png
    const parts = url.split('/upload/');
    if (parts.length !== 2) return null;
    
    // Remove the version (e.g. v1234567) if present
    let path = parts[1];
    if (path.match(/^v\d+\//)) {
      path = path.replace(/^v\d+\//, '');
    }
    
    // Remove extension
    const lastDotIndex = path.lastIndexOf('.');
    if (lastDotIndex !== -1) {
      path = path.substring(0, lastDotIndex);
    }
    return path;
  } catch (err) {
    return null;
  }
}

async function updateDatabaseUrl(oldUrl, newUrl) {
  let totalUpdated = 0;

  // 1. CurriculumItem
  const res1 = await CurriculumItem.updateMany(
    { imageUrl: oldUrl },
    { $set: { imageUrl: newUrl } }
  );
  
  // For arrays, $set with positional operator or pull/push is tricky in updateMany,
  // but we can just find them and save
  const itemsWithImagesArray = await CurriculumItem.find({ images: oldUrl });
  for (const item of itemsWithImagesArray) {
    item.images = item.images.map(img => img === oldUrl ? newUrl : img);
    await item.save();
    totalUpdated++;
  }
  totalUpdated += res1.modifiedCount;

  // 2. Unit
  const res2 = await Unit.updateMany(
    { timelineBgUrl: oldUrl },
    { $set: { timelineBgUrl: newUrl } }
  );
  const res3 = await Unit.updateMany(
    { headerBgUrl: oldUrl },
    { $set: { headerBgUrl: newUrl } }
  );
  totalUpdated += (res2.modifiedCount + res3.modifiedCount);

  // 3. Chapter
  const res4 = await Chapter.updateMany(
    { imageUrl: oldUrl },
    { $set: { imageUrl: newUrl } }
  );
  const res5 = await Chapter.updateMany(
    { bgUrl: oldUrl },
    { $set: { bgUrl: newUrl } }
  );
  totalUpdated += (res4.modifiedCount + res5.modifiedCount);

  // 4. Subject
  const res6 = await Subject.updateMany(
    { iconUrl: oldUrl },
    { $set: { iconUrl: newUrl } }
  );
  const res7 = await Subject.updateMany(
    { bgUrl: oldUrl },
    { $set: { bgUrl: newUrl } }
  );
  totalUpdated += (res6.modifiedCount + res7.modifiedCount);

  // 5. Blog
  const res8 = await Blog.updateMany(
    { image: oldUrl },
    { $set: { image: newUrl } }
  );
  
  // Replace in Blog HTML content (this is a bit rough but works for simple replacements)
  const blogsWithContent = await Blog.find({ content: { $regex: oldUrl } });
  for (const blog of blogsWithContent) {
    blog.content = blog.content.split(oldUrl).join(newUrl);
    await blog.save();
    totalUpdated++;
  }
  totalUpdated += res8.modifiedCount;

  // 6. InteractiveStory
  const res9 = await InteractiveStory.updateMany(
    { characterImg: oldUrl },
    { $set: { characterImg: newUrl } }
  );
  const res10 = await InteractiveStory.updateMany(
    { backgroundImg: oldUrl },
    { $set: { backgroundImg: newUrl } }
  );
  totalUpdated += (res9.modifiedCount + res10.modifiedCount);

  return totalUpdated;
}

const migrateImages = async () => {
  if (IMAGES_TO_MIGRATE.length === 0) {
    console.log("No images specified in IMAGES_TO_MIGRATE array.");
    process.exit(0);
  }

  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    let successCount = 0;
    let failCount = 0;

    for (const oldUrl of IMAGES_TO_MIGRATE) {
      console.log(`\nProcessing: ${oldUrl}`);
      
      const publicId = extractPublicId(oldUrl);
      if (!publicId) {
        console.log(`❌ Failed to extract public_id from ${oldUrl}`);
        failCount++;
        continue;
      }

      console.log(`Extracted public_id: ${publicId}`);

      try {
        // Upload to new Cloudinary directly from the old URL
        const result = await cloudinaryDest.uploader.upload(oldUrl, {
          public_id: publicId,
          overwrite: true,
          invalidate: true
        });

        const newUrl = result.secure_url;
        console.log(`✅ Uploaded to new account: ${newUrl}`);

        // Update Database
        const dbUpdates = await updateDatabaseUrl(oldUrl, newUrl);
        console.log(`✅ Updated ${dbUpdates} MongoDB document(s) for this image.`);
        
        successCount++;
      } catch (uploadErr) {
        console.error(`❌ Error uploading to new account:`, uploadErr.message);
        failCount++;
      }
    }

    console.log(`\n--- Migration Complete ---`);
    console.log(`Successfully migrated: ${successCount}`);
    console.log(`Failed to migrate: ${failCount}`);

  } catch (err) {
    console.error('Fatal Error:', err);
  } finally {
    mongoose.disconnect();
    process.exit(0);
  }
};

migrateImages();
