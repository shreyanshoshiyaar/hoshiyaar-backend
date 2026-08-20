import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Subject from './models/Subject.js';
import Chapter from './models/Chapter.js';
import Unit from './models/Unit.js';
import CurriculumItem from './models/CurriculumItem.js';
import Blog from './models/Blog.js';
import InteractiveStory from './models/InteractiveStory.js';
import DefaultRevisionQuestion from './models/DefaultRevisionQuestion.js';
import SystemSettings from './models/SystemSettings.js';

dotenv.config();

const CLOUD_1 = process.env.CLOUDINARY_CLOUD_NAME;
const CLOUD_2 = process.env.CLOUDINARY_CLOUD_NAME_2;
const CLOUD_3 = process.env.CLOUDINARY_CLOUD_NAME_3;

const countForCloud = async (cloudName) => {
  if (!cloudName) return 0;
  
  const regex = new RegExp(`res\\.cloudinary\\.com/${cloudName}`, 'i');
  const query = { $regex: regex };

  const subjectCount = await Subject.countDocuments({
    $or: [{ iconUrl: query }, { bgUrl: query }]
  });

  const chapterCount = await Chapter.countDocuments({
    $or: [{ imageUrl: query }, { bgUrl: query }]
  });

  const unitCount = await Unit.countDocuments({
    $or: [{ headerBgUrl: query }, { timelineBgUrl: query }]
  });

  const itemCount = await CurriculumItem.countDocuments({
    $or: [
      { imageUrl: query },
      { images: query },
      { videoUrl: query },
      { introVideoUrl: query }
    ]
  });

  const blogCount = await Blog.countDocuments({
    $or: [{ image: query }, { content: query }]
  });

  const storyCount = await InteractiveStory.countDocuments({
    $or: [{ characterImg: query }, { backgroundImg: query }]
  });

  const revisionCount = await DefaultRevisionQuestion.countDocuments({
    $or: [{ videoUrl: query }, { introVideoUrl: query }, { images: query }]
  });

  let settingsCount = 0;
  const settings = await SystemSettings.find({});
  for (const s of settings) {
    if (s.value && typeof s.value === 'string' && regex.test(s.value)) {
      settingsCount++;
    } else if (s.value && typeof s.value === 'object') {
      const stringified = JSON.stringify(s.value);
      if (regex.test(stringified)) settingsCount++;
    }
  }

  return subjectCount + chapterCount + unitCount + itemCount + blogCount + storyCount + revisionCount + settingsCount;
};

const countAll = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log(`Analyzing MongoDB for all 3 Cloudinary Accounts...\n`);

    const count1 = await countForCloud(CLOUD_1);
    const count2 = await countForCloud(CLOUD_2);
    const count3 = await countForCloud(CLOUD_3);

    console.log(`--- TOTAL DATABASE REFERENCES ---`);
    console.log(`Server 1 (${CLOUD_1}): ${count1} references`);
    console.log(`Server 2 (${CLOUD_2}): ${count2} references`);
    console.log(`Server 3 (${CLOUD_3}): ${count3} references`);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    mongoose.disconnect();
    process.exit(0);
  }
};

countAll();
