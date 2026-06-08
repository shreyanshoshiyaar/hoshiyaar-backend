import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

async function fetchRecentImages() {
  try {
    console.log("Fetching last 50 uploaded images from Cloudinary...\n");
    const result = await cloudinary.search
      .expression('resource_type:image')
      .sort_by('created_at', 'desc')
      .max_results(50)
      .execute();

    if (result && result.resources && result.resources.length > 0) {
      result.resources.forEach((img, index) => {
        console.log(`${index + 1}. [${new Date(img.created_at).toLocaleString()}]`);
        console.log(`   URL: ${img.secure_url}\n`);
      });
      console.log(`✅ Successfully fetched ${result.resources.length} images.`);
    } else {
      console.log("No images found.");
    }
  } catch (error) {
    console.error("❌ Error fetching images:", error);
  }
}

fetchRecentImages();
