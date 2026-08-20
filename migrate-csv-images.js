import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { v2 as cloudinary } from 'cloudinary';
import Papa from 'papaparse';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

// Configure Cloudinary with new account credentials
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME_2,
  api_key: process.env.CLOUDINARY_API_KEY_2,
  api_secret: process.env.CLOUDINARY_API_SECRET_2,
});

const OLD_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || 'dcxlzfyfp';
const INPUT_CSV = process.argv[2] || "D:\\New Temperature - Unit 1 v2 (1).xlsx - Sheet upload Akshit 30 July.csv";
const OUTPUT_CSV = INPUT_CSV.replace('.csv', ' - Migrated.csv');

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

async function migrateImages() {
  console.log(`Reading CSV: ${INPUT_CSV}`);
  if (!fs.existsSync(INPUT_CSV)) {
    console.error("File not found!");
    process.exit(1);
  }

  const csvContent = fs.readFileSync(INPUT_CSV, 'utf8');
  const parsed = Papa.parse(csvContent, { header: true, skipEmptyLines: true });
  
  if (parsed.errors.length > 0) {
    console.error("CSV Parsing Errors:", parsed.errors);
    process.exit(1);
  }

  const rows = parsed.data;
  let successCount = 0;
  let failCount = 0;
  
  // To avoid re-uploading the same image multiple times, we'll cache the new URLs
  const urlCache = {};

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    for (const key of Object.keys(row)) {
      const val = row[key];
      if (typeof val === 'string' && val.includes(OLD_CLOUD_NAME)) {
        console.log(`Found old URL in row ${i + 2}: ${val}`);
        
        if (urlCache[val]) {
          row[key] = urlCache[val];
          console.log(`  -> Used cached new URL: ${urlCache[val]}`);
          continue;
        }

        const publicId = extractPublicId(val);
        if (!publicId) {
          console.log(`  -> Failed to extract public_id`);
          failCount++;
          continue;
        }

        try {
          // Upload directly from the old URL to the new account
          const result = await cloudinary.uploader.upload(val, {
            public_id: publicId,
            overwrite: true
          });
          
          row[key] = result.secure_url;
          urlCache[val] = result.secure_url;
          console.log(`  -> Successfully migrated to: ${result.secure_url}`);
          successCount++;
        } catch (err) {
          console.error(`  -> Upload failed: ${err.message}`);
          failCount++;
        }
      }
    }
  }

  console.log(`\nMigration complete. Success: ${successCount}, Failed: ${failCount}`);
  
  const newCsvContent = Papa.unparse(rows);
  fs.writeFileSync(OUTPUT_CSV, newCsvContent);
  console.log(`\nSaved migrated CSV to: ${OUTPUT_CSV}`);
  console.log(`\nYou can now run:`);
  console.log(`node upload-curriculum.js "${OUTPUT_CSV}"`);
}

migrateImages();
