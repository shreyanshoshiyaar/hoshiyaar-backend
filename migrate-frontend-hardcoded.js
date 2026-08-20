import fs from 'fs';
import path from 'path';
import { v2 as cloudinaryDest } from 'cloudinary';
import dotenv from 'dotenv';

// Load backend env vars for Cloudinary config
dotenv.config();

// Configure the Destination Cloudinary Account (3rd Server)
cloudinaryDest.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME_3,
  api_key: process.env.CLOUDINARY_API_KEY_3,
  api_secret: process.env.CLOUDINARY_API_SECRET_3,
});

const DEST_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME_3;
const OLD_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME; // dcxlzfyfp

const FRONTEND_DIR = path.resolve('../Hoshiyaar-frontend-main/src');

// Regex to find old Cloudinary URLs
const cloudinaryUrlRegex = new RegExp(`https:\\/\\/res\\.cloudinary\\.com\\/${OLD_CLOUD_NAME}\\/[^"\'\\s>]+`, 'g');

// Helper to extract public_id
function extractPublicId(url) {
  try {
    const parts = url.split('/upload/');
    if (parts.length !== 2) return null;
    let filePath = parts[1];
    if (filePath.match(/^v\d+\//)) {
      filePath = filePath.replace(/^v\d+\//, '');
    }
    const lastDotIndex = filePath.lastIndexOf('.');
    if (lastDotIndex !== -1) {
      filePath = filePath.substring(0, lastDotIndex);
    }
    return filePath;
  } catch (err) {
    return null;
  }
}

// Upload using resource_type: "auto"
async function migrateUrl(oldUrl) {
  const publicId = extractPublicId(oldUrl);
  if (!publicId) return null;

  try {
    const result = await cloudinaryDest.uploader.upload(oldUrl, {
      public_id: publicId,
      overwrite: true,
      invalidate: true,
      resource_type: "auto"
    });
    return result.secure_url;
  } catch (err) {
    console.error(`❌ Error uploading ${oldUrl} to 3rd server:`, err.message);
    return null;
  }
}

// Recursively find all JS/JSX files
function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
    } else if (file.endsWith('.js') || file.endsWith('.jsx')) {
      arrayOfFiles.push(fullPath);
    }
  });

  return arrayOfFiles;
}

const migrateFrontend = async () => {
  console.log(`Scanning frontend directory for hardcoded URLs on server: ${OLD_CLOUD_NAME}...`);
  const files = getAllFiles(FRONTEND_DIR);
  
  // To avoid re-uploading the same URL multiple times, we cache the mappings
  const urlCache = {};
  let totalReplaced = 0;

  for (const filePath of files) {
    let content = fs.readFileSync(filePath, 'utf8');
    const matches = [...new Set(content.match(cloudinaryUrlRegex) || [])];

    if (matches.length > 0) {
      console.log(`\nFound ${matches.length} unique old URLs in ${path.basename(filePath)}`);
      let fileModified = false;

      for (const oldUrl of matches) {
        let newUrl = urlCache[oldUrl];

        if (!newUrl) {
          console.log(`Migrating: ${oldUrl}`);
          newUrl = await migrateUrl(oldUrl);
          if (newUrl) {
            urlCache[oldUrl] = newUrl;
          }
        }

        if (newUrl) {
          // Replace all occurrences in this file
          content = content.split(oldUrl).join(newUrl);
          fileModified = true;
          totalReplaced++;
        }
      }

      if (fileModified) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✅ Updated ${path.basename(filePath)}`);
      }
    }
  }

  console.log(`\n--- Frontend Hardcoded URL Migration Complete ---`);
  console.log(`Total occurrences replaced in frontend code: ${totalReplaced}`);
  process.exit(0);
};

migrateFrontend();
