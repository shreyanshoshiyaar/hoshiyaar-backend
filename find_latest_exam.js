import { config } from 'dotenv';
import mongoose from 'mongoose';
import DefaultRevisionQuestion from './models/DefaultRevisionQuestion.js';
import Chapter from './models/Chapter.js';

config();

async function findLatestExamContent() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    
    const latestQuestion = await DefaultRevisionQuestion.findOne().sort({ createdAt: -1 });
    
    if (latestQuestion) {
        console.log('✅ Found Exam Mode Content!');
        console.log('Most Recently Added Exam Question:', latestQuestion.questionText);
        console.log('Added On:', latestQuestion.createdAt);
        
        if (latestQuestion.chapterId) {
            const chapter = await Chapter.findById(latestQuestion.chapterId);
            console.log('Belongs to Chapter:', chapter ? chapter.title : latestQuestion.chapterId);
            
            const totalQuestionsInChapter = await DefaultRevisionQuestion.countDocuments({ chapterId: latestQuestion.chapterId });
            console.log(`Total Exam Questions for this Chapter: ${totalQuestionsInChapter}`);
        }
    } else {
        console.log('❌ No Exam Mode Content found in the database.');
    }
  } catch (error) {
    console.error(error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}
findLatestExamContent();
