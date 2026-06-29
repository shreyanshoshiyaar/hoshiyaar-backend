import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const BoardSchema = new mongoose.Schema({}, { strict: false });
const Board = mongoose.models.Board || mongoose.model('Board', BoardSchema);

const ClassLevelSchema = new mongoose.Schema({}, { strict: false });
const ClassLevel = mongoose.models.ClassLevel || mongoose.model('ClassLevel', ClassLevelSchema);

const SubjectSchema = new mongoose.Schema({}, { strict: false });
const Subject = mongoose.models.Subject || mongoose.model('Subject', SubjectSchema);

const ChapterSchema = new mongoose.Schema({}, { strict: false });
const Chapter = mongoose.models.Chapter || mongoose.model('Chapter', ChapterSchema);

const ModuleSchema = new mongoose.Schema({}, { strict: false });
const Module = mongoose.models.Module || mongoose.model('Module', ModuleSchema);

async function fetchEduvateFood() {
  try {
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
    console.log('Connected to DB');

    // 1. Find Eduvate (CBSE) board
    const eduvateBoards = await Board.find({ name: { $regex: /eduvate/i } });
    if (eduvateBoards.length === 0) {
      console.log('Could not find Eduvate board in DB.');
      process.exit(0);
    }
    
    for (const board of eduvateBoards) {
        console.log(`\n🔍 Searching inside Board: ${board.name}`);
        
        // 2. Find Classes for this board
        const classes = await ClassLevel.find({ boardId: board._id });
        
        for (const cls of classes) {
            // 3. Find Subjects for this class
            const subjects = await Subject.find({ classId: cls._id });
            
            for (const subject of subjects) {
                // 4. Find Food chapters in this subject
                const chapters = await Chapter.find({ subjectId: subject._id, title: { $regex: /food/i } });
                
                for (const chapter of chapters) {
                    console.log(`\n========================================`);
                    console.log(`Class: ${cls.name} | Subject: ${subject.name}`);
                    console.log(`Chapter: ${chapter.title} (ID: ${chapter._id})`);
                    console.log(`========================================`);

                    const modules = await Module.find({ chapterId: chapter._id }).sort({ order: 1 });
                    if (modules.length === 0) {
                      console.log('  No modules found.');
                    } else {
                      modules.forEach((mod, index) => {
                        console.log(`  Module ${index + 1}: ${mod.title}`);
                      });
                    }
                }
            }
        }
    }

  } catch (err) {
    console.error(err);
  } finally {
    mongoose.disconnect();
  }
}

fetchEduvateFood();
