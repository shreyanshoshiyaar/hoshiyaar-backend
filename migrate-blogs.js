import mongoose from 'mongoose';
import { v2 as cloudinaryDest } from 'cloudinary';
import dotenv from 'dotenv';
import Blog from './models/Blog.js';

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

const migrateBlogs = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    let successCount = 0;
    let failCount = 0;

    const blogs = await Blog.find({});
    console.log(`Found ${blogs.length} blogs to inspect...`);

    for (const blog of blogs) {
      let modified = false;

      // 1. Check main blog image
      if (needsMigration(blog.image)) {
        const success = await migrateAndReplaceUrl(blog.image, async (newUrl) => {
          blog.image = newUrl;
        });
        if (success) { modified = true; successCount++; } else failCount++;
      }

      // 2. Check HTML content for inline images
      if (blog.content) {
        // Regex to find all Cloudinary URLs in the content
        const cloudinaryUrlRegex = /https:\/\/res\.cloudinary\.com\/[^\/]+\/(image|video)\/upload\/[^"'\s>]+/g;
        let match;
        let newContent = blog.content;
        const urlsFound = [...new Set(blog.content.match(cloudinaryUrlRegex) || [])];
        
        for (const url of urlsFound) {
          if (needsMigration(url)) {
            const success = await migrateAndReplaceUrl(url, async (newUrl) => {
              // Replace all occurrences of the old URL with the new URL in the HTML string
              newContent = newContent.split(url).join(newUrl);
            });
            if (success) { modified = true; successCount++; } else failCount++;
          }
        }
        
        if (modified) {
          blog.content = newContent;
        }
      }

      if (modified) {
        await blog.save();
      }
    }

    console.log(`\n--- Blog Migration Complete ---`);
    console.log(`Total URLs successfully migrated and updated in DB: ${successCount}`);
    console.log(`Failed to migrate: ${failCount}`);

  } catch (err) {
    console.error('Fatal Error:', err);
  } finally {
    mongoose.disconnect();
    process.exit(0);
  }
};

migrateBlogs();
