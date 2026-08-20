import mongoose from 'mongoose';
import { v2 as cloudinaryDest } from 'cloudinary';
import dotenv from 'dotenv';
import CurriculumItem from './models/CurriculumItem.js';

dotenv.config();

// Configure the Destination Cloudinary Account (3rd Server)
cloudinaryDest.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME_3,
  api_key: process.env.CLOUDINARY_API_KEY_3,
  api_secret: process.env.CLOUDINARY_API_SECRET_3,
});

const OLD_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME; // dcxlzfyfp
const DEST_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME_3; // w7rytq0k

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

const fixLastItem = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log(`Hunting down the final Curriculum Item...`);

    const regex = new RegExp(`res\\.cloudinary\\.com/${OLD_CLOUD_NAME}`, 'i');
    const items = await CurriculumItem.find({
      $or: [{ imageUrl: { $regex: regex } }, { images: { $regex: regex } }, { videoUrl: { $regex: regex } }, { introVideoUrl: { $regex: regex } }]
    });

    if (items.length === 0) {
      console.log('No items found! Maybe it was a cache issue?');
      process.exit(0);
    }

    const item = items[0];
    console.log(`\nFOUND ITEM ID: ${item._id}`);
    
    const urls = [];
    if (item.imageUrl && regex.test(item.imageUrl)) urls.push({ field: 'imageUrl', url: item.imageUrl });
    if (item.videoUrl && regex.test(item.videoUrl)) urls.push({ field: 'videoUrl', url: item.videoUrl });
    if (item.introVideoUrl && regex.test(item.introVideoUrl)) urls.push({ field: 'introVideoUrl', url: item.introVideoUrl });
    
    if (item.images) {
      item.images.forEach((img, idx) => {
        if (regex.test(img)) urls.push({ field: `images[${idx}]`, url: img });
      });
    }

    console.log(`Problematic URLs found inside this item:`);
    urls.forEach(u => console.log(`- ${u.field}: ${u.url}`));

    for (const u of urls) {
      console.log(`\nAttempting to migrate: ${u.url}`);
      const publicId = extractPublicId(u.url);
      if (!publicId) {
        console.log(`❌ URL format is too broken to extract public ID.`);
        continue;
      }
      
      try {
        const result = await cloudinaryDest.uploader.upload(u.url, {
          public_id: publicId,
          overwrite: true,
          invalidate: true,
          resource_type: "auto"
        });
        
        console.log(`✅ Upload SUCCESS! New URL: ${result.secure_url}`);
        
        // Apply fix to DB
        if (u.field.startsWith('images[')) {
          const idx = parseInt(u.field.match(/\d+/)[0]);
          item.images[idx] = result.secure_url;
        } else {
          item[u.field] = result.secure_url;
        }
        
      } catch (err) {
        console.log(`❌ Upload FAILED: ${err.message}`);
        console.log(`This link might be totally dead/404 on the old server.`);
      }
    }

    await item.save();
    console.log(`\nItem saved. Re-run check-remaining.js to see if it's cleared!`);

  } catch (err) {
    console.error('Fatal Error:', err);
  } finally {
    mongoose.disconnect();
    process.exit(0);
  }
};

fixLastItem();
