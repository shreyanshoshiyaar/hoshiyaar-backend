import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { v2 as cloudinary } from 'cloudinary';
import InteractiveStory from './models/InteractiveStory.js';

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const story = await InteractiveStory.findOne({ board: 'CBSE', classLevel: '6' });
    if (!story) {
      console.log('Story not found');
      process.exit(1);
    }

    let updated = false;

    // Convert background music
    if (story.backgroundMusic && story.backgroundMusic.includes('drive.google.com')) {
      console.log(`Uploading background music...`);
      try {
        const result = await cloudinary.uploader.upload(story.backgroundMusic, {
          resource_type: 'video',
          folder: 'hoshiyaar_audio'
        });
        console.log(`✅ Background music uploaded: ${result.secure_url}`);
        story.backgroundMusic = result.secure_url;
        updated = true;
      } catch (err) {
        console.error(`❌ Failed to upload background music:`, err.message);
      }
    }

    for (let i = 0; i < story.slides.length; i++) {
      const slide = story.slides[i];
      if (slide.audioUrl && slide.audioUrl.includes('drive.google.com')) {
        console.log(`Uploading audio for slide ${i}...`);
        try {
          const result = await cloudinary.uploader.upload(slide.audioUrl, {
            resource_type: 'video',
            folder: 'hoshiyaar_audio'
          });
          
          console.log(`✅ Slide ${i} audio uploaded: ${result.secure_url}`);
          slide.audioUrl = result.secure_url;
          updated = true;
        } catch (err) {
          console.error(`❌ Failed to upload audio for slide ${i}:`, err.message);
        }
      }
    }

    if (updated) {
      await story.save();
      console.log('🎉 Story updated with Cloudinary audio links!');
    } else {
      console.log('No drive links found or all failed.');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

run();
