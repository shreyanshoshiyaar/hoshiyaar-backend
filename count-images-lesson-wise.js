import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Module from './models/Module.js';
import CurriculumItem from './models/CurriculumItem.js';
import Chapter from './models/Chapter.js';
import Subject from './models/Subject.js';
import Board from './models/Board.js';
import ClassLevel from './models/ClassLevel.js';

dotenv.config();

const countImagesLessonWise = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Calculating image counts grouped by Lesson (Module)...\n');

    const modules = await Module.find({}).populate('chapterId');
    
    // We will group the output by Subject/Chapter for readability
    const results = {};

    for (const mod of modules) {
      if (!mod.chapterId) continue;
      
      const chapter = await Chapter.findById(mod.chapterId._id).populate('subjectId');
      if (!chapter || !chapter.subjectId) continue;

      const subject = await Subject.findById(chapter.subjectId._id).populate('boardId classId');
      if (!subject || !subject.boardId || !subject.classId) continue;

      const groupingKey = `[${subject.boardId.name}] Class ${subject.classId.name} - ${subject.name} - ${chapter.title}`;
      
      if (!results[groupingKey]) {
        results[groupingKey] = [];
      }

      // Fetch all curriculum items for this module
      const items = await CurriculumItem.find({ moduleId: mod._id });
      
      let imageCount = 0;
      const urlRegex = /https:\/\/res\.cloudinary\.com/ig;

      items.forEach(item => {
        if (item.imageUrl && urlRegex.test(item.imageUrl)) imageCount++;
        if (item.videoUrl && urlRegex.test(item.videoUrl)) imageCount++;
        if (item.introVideoUrl && urlRegex.test(item.introVideoUrl)) imageCount++;
        if (item.images && item.images.length > 0) {
          item.images.forEach(img => {
            if (urlRegex.test(img)) imageCount++;
          });
        }
      });

      results[groupingKey].push({
        lessonTitle: mod.title || `Module ${mod.order || '?'}`,
        count: imageCount
      });
    }

    let totalLessons = 0;
    let totalImages = 0;

    for (const [group, lessons] of Object.entries(results)) {
      // Only print groups that actually have images to avoid clutter
      const totalInGroup = lessons.reduce((sum, l) => sum + l.count, 0);
      if (totalInGroup > 0) {
        console.log(`\n--- ${group} ---`);
        lessons.forEach(l => {
          if (l.count > 0) {
            console.log(`  Lesson: ${l.lessonTitle} -> ${l.count} images/videos`);
            totalLessons++;
            totalImages += l.count;
          }
        });
      }
    }

    console.log(`\n==============================================`);
    console.log(`Total Lessons with Media: ${totalLessons}`);
    console.log(`Total Media Assets inside these Lessons: ${totalImages}`);
    console.log(`==============================================\n`);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    mongoose.disconnect();
    process.exit(0);
  }
};

countImagesLessonWise();
