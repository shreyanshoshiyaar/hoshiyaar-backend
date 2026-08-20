import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

// Helper to fetch total resource count for a specific account
async function getAccountUsage(cloudName, apiKey, apiSecret, label) {
  try {
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
    });

    const result = await cloudinary.api.usage();
    // result.objects.usage contains the total number of assets in the account
    const totalAssets = result.objects ? result.objects.usage : 'N/A';
    
    console.log(`--- ${label} ---`);
    console.log(`Cloud Name: ${cloudName}`);
    console.log(`Total Physical Assets on Server: ${totalAssets}\n`);
  } catch (err) {
    console.log(`--- ${label} ---`);
    console.log(`Cloud Name: ${cloudName}`);
    console.error(`Failed to fetch: ${err.message}\n`);
  }
}

const checkCloudinaryCounts = async () => {
  console.log('Fetching physical image/video counts directly from Cloudinary servers...\n');

  // Server 1
  await getAccountUsage(
    process.env.CLOUDINARY_CLOUD_NAME,
    process.env.CLOUDINARY_API_KEY,
    process.env.CLOUDINARY_API_SECRET,
    'SERVER 1 (Oldest)'
  );

  // Server 2
  await getAccountUsage(
    process.env.CLOUDINARY_CLOUD_NAME_2,
    process.env.CLOUDINARY_API_KEY_2,
    process.env.CLOUDINARY_API_SECRET_2,
    'SERVER 2'
  );

  // Server 3
  await getAccountUsage(
    process.env.CLOUDINARY_CLOUD_NAME_3,
    process.env.CLOUDINARY_API_KEY_3,
    process.env.CLOUDINARY_API_SECRET_3,
    'SERVER 3 (Newest)'
  );
  
  process.exit(0);
};

checkCloudinaryCounts();
