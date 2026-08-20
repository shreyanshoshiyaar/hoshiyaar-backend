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

const getGlobalUniqueCount = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log(`Analyzing entire database for UNIQUE Cloudinary assets...\n`);

    // Matches any res.cloudinary.com URL across all your servers
    const regex = /https:\/\/res\.cloudinary\.com\/[^\s'"><]+/ig;
    const allUrls = [];

    // Helper to safely extract and push URLs
    const extractUrls = (text) => {
      if (!text || typeof text !== 'string') return;
      const matches = text.match(regex);
      if (matches) {
        matches.forEach(m => allUrls.push(m));
      }
    };

    // 1. Subjects
    const subjects = await Subject.find({});
    subjects.forEach(s => { extractUrls(s.iconUrl); extractUrls(s.bgUrl); });

    // 2. Chapters
    const chapters = await Chapter.find({});
    chapters.forEach(c => { extractUrls(c.imageUrl); extractUrls(c.bgUrl); });

    // 3. Units
    const units = await Unit.find({});
    units.forEach(u => { extractUrls(u.headerBgUrl); extractUrls(u.timelineBgUrl); });

    // 4. Curriculum Items
    const items = await CurriculumItem.find({});
    items.forEach(i => {
      extractUrls(i.imageUrl);
      extractUrls(i.videoUrl);
      extractUrls(i.introVideoUrl);
      if (i.images) i.images.forEach(img => extractUrls(img));
    });

    // 5. Interactive Stories
    const stories = await InteractiveStory.find({});
    stories.forEach(s => {
      extractUrls(s.backgroundImg);
      extractUrls(s.backgroundMusic);
      if (s.slides) {
        s.slides.forEach(slide => {
          extractUrls(slide.characterImg);
          extractUrls(slide.audioUrl);
        });
      }
    });

    // 6. Revision Questions
    const revisions = await DefaultRevisionQuestion.find({});
    revisions.forEach(q => {
      extractUrls(q.videoUrl);
      extractUrls(q.introVideoUrl);
      if (q.images) q.images.forEach(img => extractUrls(img));
    });
    
    // 7. Blogs
    const blogs = await Blog.find({});
    blogs.forEach(b => {
      extractUrls(b.image);
      extractUrls(b.content);
    });

    // 8. System Settings
    const settings = await SystemSettings.find({});
    settings.forEach(s => {
      if (s.value) {
        extractUrls(typeof s.value === 'string' ? s.value : JSON.stringify(s.value));
      }
    });

    // Remove duplicates
    const uniqueUrls = new Set(allUrls);

    console.log(`--- GLOBAL DATABASE ASSET COUNT ---`);
    console.log(`Total Gross References (includes duplicates): ${allUrls.length}`);
    console.log(`Total UNIQUE Physical Assets Used by App: ${uniqueUrls.size}`);
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    mongoose.disconnect();
    process.exit(0);
  }
};

getGlobalUniqueCount();
