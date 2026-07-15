import mongoose from 'mongoose';
import { v2 as cloudinary } from 'cloudinary';
import InteractiveStory from './models/InteractiveStory.js';
import dotenv from 'dotenv';
dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

async function uploadDriveToCloudinary(driveUrl, resourceType = 'auto') {
  if (!driveUrl || !driveUrl.includes('drive.google.com')) return driveUrl;

  const match = driveUrl.match(/d\/([a-zA-Z0-9_-]+)/);
  if (!match) return driveUrl;
  const fileId = match[1];
  
  const directUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
  
  console.log(`Uploading ${fileId}...`);
  try {
    const result = await cloudinary.uploader.upload(directUrl, { resource_type: resourceType });
    return result.secure_url;
  } catch (err) {
    console.error('Error uploading to Cloudinary:', err.message);
    return directUrl; // Fallback to direct url
  }
}

async function run() {
  await mongoose.connect(process.env.MONGO_URI);

  const bgMusicDrive = 'https://drive.google.com/file/d/1w5acUt8PO0XmymNOGhx3w1lz5dTwozoT/view?usp=sharing';
  const bgImage = 'https://res.cloudinary.com/dcxlzfyfp/image/upload/v1784117563/img-to-link/khz6hl8csf7z3ddycaco.webp';

  const slidesRaw = [
    {
      characterImg: 'https://res.cloudinary.com/dcxlzfyfp/image/upload/v1784116309/img-to-link/bzy2zoz8l2axxjfccxvs.webp',
      dialogue: 'Ahoy, explorers! ⚓ We found a treasure map… but there’s a problem.',
      audioDrive: 'https://drive.google.com/file/d/1_9sOSjEf7CEI7CwyNnPYt5w_XdtwIbEc/view?usp=sharing',
      buttons: [ { label: '🏴‍☠️ I’m Ready', nextSlideIndex: 1 } ]
    },
    {
      characterImg: 'https://res.cloudinary.com/dcxlzfyfp/image/upload/v1784116308/img-to-link/ygj7dmvldtcuwwezlqgf.webp',
      dialogue: 'The map says, ‘Treasure lies to the North.’ 🗺️ But… how do we find North?',
      audioDrive: 'https://drive.google.com/file/d/16laN2cRXrRoc2s_4JYfQRXUifB_VSKWl/view?usp=sharing',
      buttons: [
        { label: 'A. 🧭 Compass', nextSlideIndex: 2 },
        { label: 'B. ⌚ Watch', nextSlideIndex: 1, isWrong: true }
      ]
    },
    {
      characterImg: 'https://res.cloudinary.com/dcxlzfyfp/image/upload/v1784116308/img-to-link/ygj7dmvldtcuwwezlqgf.webp',
      dialogue: 'Smart choice — let’s use the compass!',
      audioDrive: 'https://drive.google.com/file/d/1oyY4I3H-8qgmnlOhUC9gNEoyATwGdKM2/view?usp=drive_link',
      buttons: [ { label: '➡️ Next', nextSlideIndex: 3 } ]
    },
    {
      characterImg: 'https://res.cloudinary.com/dcxlzfyfp/image/upload/v1784116306/img-to-link/qevibtivhditmd4ojiw7.webp',
      dialogue: 'Wait… why does a compass always point North? 🤔',
      audioDrive: 'https://drive.google.com/file/d/1e7ryyPsIrso7-Mcd0cHC6PkaAyNAs84S/view?usp=sharing',
      buttons: [
        { label: 'A. ✨ Magic', nextSlideIndex: 3, isWrong: true },
        { label: 'B. 🔬 Science', nextSlideIndex: 4 }
      ]
    },
    {
      characterImg: 'https://res.cloudinary.com/dcxlzfyfp/image/upload/v1784116306/img-to-link/qevibtivhditmd4ojiw7.webp',
      dialogue: 'Correct — it’s science!',
      audioDrive: 'https://drive.google.com/file/d/19m5Xzas371UevqeZzTJkXLRwCq5oQ2X_/view?usp=sharing',
      buttons: [ { label: '✅ Tell Me More', nextSlideIndex: 5 } ]
    },
    {
      characterImg: 'https://res.cloudinary.com/dcxlzfyfp/image/upload/v1784116307/img-to-link/jy8iynsnjyjtdfcut5ic.webp',
      dialogue: 'Here’s the secret! 🤩 A compass has a tiny magnet inside. It lines up North–South and helps sailors find direction.',
      audioDrive: 'https://drive.google.com/file/d/182dIYpdZVjHPVawdlcT-Wb1DrO5fLHUb/view?usp=sharing',
      buttons: [ { label: '🧲 Learn Magnets', nextSlideIndex: 6 } ]
    },
    {
      characterImg: 'https://res.cloudinary.com/dcxlzfyfp/image/upload/v1784116303/img-to-link/dywh9ymes5hezr9fnj3d.webp',
      dialogue: 'If a tiny magnet can guide a ship, imagine what else magnets can do! ⚓🧲',
      audioDrive: 'https://drive.google.com/file/d/1zSyG9yzYEV6Y1HlqTzsjhzZh4xSj2Mxi/view?usp=drive_link',
      buttons: [ { label: '🚀 Start Adventure', nextSlideIndex: -1 } ]
    }
  ];

  const bgMusic = await uploadDriveToCloudinary(bgMusicDrive, 'video');

  const slides = [];
  for (const s of slidesRaw) {
    const audioUrl = await uploadDriveToCloudinary(s.audioDrive, 'video');
    slides.push({
      characterImg: s.characterImg,
      dialogue: s.dialogue,
      audioUrl: audioUrl,
      buttons: s.buttons
    });
  }

  const board = 'CBSE'; 
  const classLevel = 'Class 6';

  await InteractiveStory.findOneAndUpdate(
    { board, classLevel },
    { board, classLevel, backgroundImg: bgImage, backgroundMusic: bgMusic, slides, isActive: true },
    { upsert: true }
  );

  console.log('Successfully inserted Class 6 story with Cloudinary links!');
  process.exit(0);
}

run().catch(console.error);
