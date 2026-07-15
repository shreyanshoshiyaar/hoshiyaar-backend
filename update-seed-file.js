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
      
      let updated = false;

      if (story.backgroundMusic && story.backgroundMusic.includes('cloudinary')) {
        const bgRegex = /(backgroundMusic:\s*['"])([^'"]+)(['"])/;
        seedContent = seedContent.replace(bgRegex, (match, p1, p2, p3) => {
          if (p2 !== story.backgroundMusic) {
            updated = true;
            return `${p1}${story.backgroundMusic}${p3}`;
          }
          return match;
        });
      }

      story.slides.forEach((slide) => {
        if (slide.audioUrl && slide.audioUrl.includes('cloudinary')) {
          const dialogueStr = slide.dialogue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // escape regex
          const regex = new RegExp(`(dialogue:\\s*["']${dialogueStr}["'],\\s*audioUrl:\\s*['"])([^'"]+)(['"])`);
          
          seedContent = seedContent.replace(regex, (match, p1, p2, p3) => {
            if (p2 !== slide.audioUrl) {
              updated = true;
              return `${p1}${slide.audioUrl}${p3}`;
            }
            return match;
          });
        }
      });
      
      if (updated) {
        fs.writeFileSync('./seed-interactive-story.js', seedContent);
        console.log('✅ seed-interactive-story.js has been successfully updated with Cloudinary links!');
      } else {
        console.log('seed-interactive-story.js already has the correct links or links were not found.');
      }
    } else {
      console.log('Story not found in DB.');
    }
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

run();
