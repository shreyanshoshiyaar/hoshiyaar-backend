import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Unit from './models/Unit.js';
import Chapter from './models/Chapter.js';

dotenv.config();

const fetchTimelineBackgrounds = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    const units = await Unit.find({}).populate('chapterId', 'title isPublished').lean();
    
    let draftCount = 0;
    let publishedCount = 0;
    let draftWithBg = 0;
    let publishedWithBg = 0;

    units.forEach((u) => {
      const isDraft = u.chapterId ? !u.chapterId.isPublished : true;
      const hasBg = !!u.timelineBgUrl;

      if (isDraft) {
        draftCount++;
        if (hasBg) draftWithBg++;
      } else {
        publishedCount++;
        if (hasBg) publishedWithBg++;
      }

      if (hasBg) {
        console.log(`[${isDraft ? 'DRAFT' : 'PUBLISHED'}] Unit: ${u.title} - BG: ${u.timelineBgUrl}`);
      }
    });

    console.log('\n--- Summary ---');
    console.log(`Published Units: ${publishedCount} (Has BG: ${publishedWithBg})`);
    console.log(`Draft Units: ${draftCount} (Has BG: ${draftWithBg})`);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    mongoose.disconnect();
    process.exit(0);
  }
};

fetchTimelineBackgrounds();
