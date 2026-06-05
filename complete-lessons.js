import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import Module from './models/Module.js';
import Chapter from './models/Chapter.js';
import Subject from './models/Subject.js';

dotenv.config();

mongoose.connect(process.env.MONGO_URI)
.then(async () => {
  const users = await User.find({ phone: { $in: ['9867735936', '+919867735936', '7021970672', '+917021970672'] } });
  const allModules = await Module.find({});
  const allChapters = await Chapter.find({});
  const allSubjects = await Subject.find({});
  
  for (const user of users) {
    if (!user.chaptersProgress) user.chaptersProgress = [];
    
    // Group all modules by chapter and subject
    for (const mod of allModules) {
      const chapter = allChapters.find(c => c._id.toString() === mod.chapterId.toString());
      if (!chapter) continue;
      const subject = allSubjects.find(s => s._id.toString() === chapter.subjectId.toString());
      if (!subject) continue;
      
      const chapterOrder = chapter.order || 1;
      const subjectName = subject.name || 'Science';
      
      let pIndex = user.chaptersProgress.findIndex(p => p.chapter === chapterOrder && p.subject === subjectName);
      if (pIndex === -1) {
        user.chaptersProgress.push({
          chapter: chapterOrder,
          subject: subjectName,
          conceptCompleted: true,
          quizCompleted: true,
          completedModules: [mod._id.toString()],
          updatedAt: new Date()
        });
      } else {
        user.chaptersProgress[pIndex].conceptCompleted = true;
        user.chaptersProgress[pIndex].quizCompleted = true;
        user.chaptersProgress[pIndex].updatedAt = new Date();
        if (!user.chaptersProgress[pIndex].completedModules) {
          user.chaptersProgress[pIndex].completedModules = [];
        }
        if (!user.chaptersProgress[pIndex].completedModules.includes(mod._id.toString())) {
          user.chaptersProgress[pIndex].completedModules.push(mod._id.toString());
        }
      }
    }
    await user.save();
    console.log('Updated user ' + user.phone + ' with all lessons completed');
  }
  mongoose.disconnect();
})
.catch(err => console.error(err));
