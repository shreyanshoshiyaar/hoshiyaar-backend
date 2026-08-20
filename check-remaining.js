import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Subject from './models/Subject.js';
import Chapter from './models/Chapter.js';
import Unit from './models/Unit.js';
import Module from './models/Module.js';
import CurriculumItem from './models/CurriculumItem.js';
import Blog from './models/Blog.js';
import InteractiveStory from './models/InteractiveStory.js';
import DefaultRevisionQuestion from './models/DefaultRevisionQuestion.js';
import SystemSettings from './models/SystemSettings.js';

dotenv.config();

const OLD_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;

const checkRemaining = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log(`Searching for all remaining content on Server 1 (${OLD_CLOUD_NAME})...\n`);

    const regex = new RegExp(`res\\.cloudinary\\.com/${OLD_CLOUD_NAME}`, 'i');
    const query = { $regex: regex };

    const subjects = await Subject.find({ $or: [{ iconUrl: query }, { bgUrl: query }] }).populate('boardId classId');
    const chapters = await Chapter.find({ $or: [{ imageUrl: query }, { bgUrl: query }] });
    const units = await Unit.find({ $or: [{ headerBgUrl: query }, { timelineBgUrl: query }] });
    
    const items = await CurriculumItem.find({
      $or: [{ imageUrl: query }, { images: query }, { videoUrl: query }, { introVideoUrl: query }]
    });

    const blogs = await Blog.find({ $or: [{ image: query }, { content: query }] });
    const stories = await InteractiveStory.find({ $or: [{ characterImg: query }, { backgroundImg: query }] });
    const revisions = await DefaultRevisionQuestion.find({ $or: [{ videoUrl: query }, { introVideoUrl: query }, { images: query }] });

    let settingsCount = 0;
    const settings = await SystemSettings.find({});
    for (const s of settings) {
      if (s.value && typeof s.value === 'string' && regex.test(s.value)) settingsCount++;
      else if (s.value && typeof s.value === 'object') {
        if (regex.test(JSON.stringify(s.value))) settingsCount++;
      }
    }

    console.log(`--- REMAINING DOCUMENTS ON SERVER 1 ---`);
    console.log(`Subjects: ${subjects.length}`);
    console.log(`Chapters: ${chapters.length}`);
    console.log(`Units: ${units.length}`);
    console.log(`Curriculum Items: ${items.length}`);
    console.log(`Blogs: ${blogs.length}`);
    console.log(`Interactive Stories: ${stories.length}`);
    console.log(`Revision Questions: ${revisions.length}`);
    console.log(`System Settings: ${settingsCount}`);

    const total = subjects.length + chapters.length + units.length + items.length + blogs.length + stories.length + revisions.length + settingsCount;
    console.log(`\nTotal Documents with Old Cloudinary URLs: ${total}`);

    // Detail breakdown for CurriculumItems since they usually have the most
    if (items.length > 0) {
      console.log('\n--- BREAKDOWN OF REMAINING CURRICULUM ITEMS ---');
      const moduleIds = [...new Set(items.map(i => i.moduleId.toString()))];
      const foundModules = await Module.find({ _id: { $in: moduleIds } }, 'chapterId');
      const chapterIds = [...new Set(foundModules.map(m => m.chapterId.toString()))];
      const foundChapters = await Chapter.find({ _id: { $in: chapterIds } }, 'subjectId');
      const subjectIds = [...new Set(foundChapters.map(c => c.subjectId.toString()))];
      const foundSubjects = await Subject.find({ _id: { $in: subjectIds } }).populate('boardId classId');
      
      const locations = {};
      foundSubjects.forEach(s => {
        if (s.boardId && s.classId) {
          const key = `Board: ${s.boardId.name} | Class: ${s.classId.name}`;
          locations[key] = (locations[key] || 0) + 1;
        }
      });
      
      Object.entries(locations).forEach(([loc, count]) => {
        console.log(`- ${loc} (Has remaining items)`);
      });
    }

  } catch (err) {
    console.error('Error:', err);
  } finally {
    mongoose.disconnect();
    process.exit(0);
  }
};

checkRemaining();
