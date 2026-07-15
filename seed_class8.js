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

  const bgMusicDrive = 'https://drive.google.com/file/d/1YDh2f1nazk6vOEguNCSFMFoQzLwvmqZt/view?usp=drive_link';
  const bgImage = 'https://res.cloudinary.com/dcxlzfyfp/image/upload/v1784119214/img-to-link/t19v6fhlnn2ugzsczfje.webp';

  const slidesRaw = [
    // Slide 0: Screen 1 Welcome
    {
      characterImg: 'https://res.cloudinary.com/dcxlzfyfp/image/upload/v1784119214/img-to-link/eixfv0yatabemuunirga.webp',
      dialogue: 'Welcome, young scientists! 🔬 Today, we’ll explore a world that’s alive… but invisible.',
      audioDrive: 'https://drive.google.com/file/d/1EbUzdRfPAtBjyMui4xUN4hepNkhZO4Yb/view?usp=sharing',
      buttons: [ { label: '👀 Show Me', nextSlideIndex: 1 } ]
    },
    // Slide 1: Screen 2 Invisible... But Alive?
    {
      characterImg: 'https://res.cloudinary.com/dcxlzfyfp/image/upload/v1784119212/img-to-link/ysuibz7ibosj7qrpcmf4.webp',
      dialogue: 'Arpit Sir, I can see plants 🌱 and animals 🐶… but can something living be too tiny to see?',
      audioDrive: 'https://drive.google.com/file/d/1YJn3AFRkvgDUU14RDhRmOLbOsFtqh98t/view?usp=sharing',
      buttons: [
        { label: 'A. No, all living things can be seen', nextSlideIndex: 1, isWrong: true },
        { label: 'B. Yes, some living things are too tiny to see', nextSlideIndex: 2 }
      ]
    },
    // Slide 2: Screen 2 Correct Answer Follow-up
    {
      characterImg: 'https://res.cloudinary.com/dcxlzfyfp/image/upload/v1784119212/img-to-link/ysuibz7ibosj7qrpcmf4.webp',
      dialogue: 'Wait… there’s an invisible living world? 😲',
      audioDrive: 'https://drive.google.com/file/d/1bELipw1YT5SzOp3GWukf65ghmKqR-muP/view?usp=sharing',
      buttons: [ { label: '➡️ Next', nextSlideIndex: 3 } ]
    },
    // Slide 3: Screen 3 How Can We See It?
    {
      characterImg: 'https://res.cloudinary.com/dcxlzfyfp/image/upload/v1784119211/img-to-link/oyw9j2wqery2xajgu0to.webp',
      dialogue: 'But if it’s invisible… how did scientists find it?',
      audioDrive: 'https://drive.google.com/file/d/1M3vOSsTHZbLRU5KY8YG-BTyEsLyjuMXd/view?usp=sharing',
      buttons: [
        { label: 'A. With a microscope 🔬', nextSlideIndex: 4 },
        { label: 'B. With a mirror', nextSlideIndex: 3, isWrong: true }
      ]
    },
    // Slide 4: Screen 3 Correct Answer Follow-up
    {
      characterImg: 'https://res.cloudinary.com/dcxlzfyfp/image/upload/v1784119211/img-to-link/oyw9j2wqery2xajgu0to.webp',
      dialogue: 'Of course — a microscope!',
      audioDrive: 'https://drive.google.com/file/d/1HRsI9wLQ7qeuzxXWx_WsqbBOHD7wbSMZ/view?usp=sharing',
      buttons: [ { label: '✅ Next', nextSlideIndex: 5 } ]
    },
    // Slide 5: Screen 4 Let's Zoom In
    {
      characterImg: 'https://res.cloudinary.com/dcxlzfyfp/image/upload/v1784119210/img-to-link/yoe8czapfaw5zkorpg48.webp',
      dialogue: 'Exactly! Let’s zoom into this hidden world with a microscope. 🔬',
      audioDrive: 'https://drive.google.com/file/d/1UDFCBfZzEZUNe73GqInv63x2spEq-J59/view?usp=sharing',
      buttons: [ { label: '👀 Zoom In', nextSlideIndex: 6 } ]
    },
    // Slide 6: Screen 5 Meet the Cell
    {
      characterImg: 'https://res.cloudinary.com/dcxlzfyfp/image/upload/v1784119209/img-to-link/cetj8mwif92zgowmahph.webp',
      dialogue: 'Wow! These tiny parts are called cells — the building blocks of our body! 🤩',
      audioDrive: 'https://drive.google.com/file/d/1Y_dWPlcXvPhX3Mb7N-AtlRb-ttxDT-C5/view?usp=sharing',
      buttons: [ { label: '🚀 Explore Cells', nextSlideIndex: -1 } ]
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
  const classLevel = '8';
  
  // Note: we use "8" for classLevel because in the DB, class "8" is just "8" or maybe "Class 8".
  // Looking at the data, it's safer to use the exact names from Admin Panel. 
  // Wait, I will just use "8" and we can edit it in Admin Panel if needed.

  await InteractiveStory.findOneAndUpdate(
    { board, classLevel: { $regex: /8/ } },
    { board, classLevel: '8', backgroundImg: bgImage, backgroundMusic: bgMusic, slides, isActive: true },
    { upsert: true }
  );

  console.log('Successfully inserted Class 8 story with Cloudinary links!');
  process.exit(0);
}

run().catch(console.error);
