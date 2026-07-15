import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import InteractiveStory from './models/InteractiveStory.js';

dotenv.config();

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const story = await InteractiveStory.findOne({ board: 'CBSE', classLevel: '6' });
    
    if (story) {
      let seedContent = fs.readFileSync('./seed-interactive-story.js', 'utf8');
      
      story.slides.forEach((slide, index) => {
        if (slide.audioUrl && slide.audioUrl.includes('cloudinary')) {
          // Find the corresponding audioUrl line in the seed file (roughly matching the index)
          // A safer way is to replace the specific drive link with the cloudinary link
          // Since we know the drive links, let's just do a regex replace
          // But wait, the simplest way is to dump the whole JS object
          console.log(`Slide ${index} Audio: ${slide.audioUrl}`);
        }
      });
      
      console.log('✅ URLs found. Please share these URLs with the AI assistant!');
    }
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

run();
