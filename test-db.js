import mongoose from 'mongoose';
import dotenv from 'dotenv';
import InteractiveStory from './models/InteractiveStory.js';

dotenv.config();

const runTest = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const story = await InteractiveStory.findOne({ board: 'CBSE', classLevel: '6', isActive: true });
    
    if (story) {
      console.log('✅ Found story:', story.board, story.classLevel);
      console.log('Slides:', story.slides.length);
    } else {
      console.log('❌ Story not found in DB!');
      const all = await InteractiveStory.find();
      console.log('All stories in DB:', all.map(s => `${s.board} ${s.classLevel}`));
    }
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};
runTest();
