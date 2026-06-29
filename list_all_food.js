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

async function listAllFoodChapters() {
  try {
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
    
    // Find all chapters with "food"
    const chapters = await Chapter.find({ title: { $regex: /food/i } });
    console.log(`Found ${chapters.length} Food chapters across all boards:\n`);

    for (const chapter of chapters) {
        let boardName = "Unknown Board";
        let className = "Unknown Class";
        let subjectName = "Unknown Subject";

        if (chapter.subjectId) {
            const subject = await Subject.findById(chapter.subjectId);
            if (subject) {
                subjectName = subject.name;
                if (subject.classId) {
                    const cls = await ClassLevel.findById(subject.classId);
                    if (cls) {
                        className = cls.name;
                        if (cls.boardId) {
                            const board = await Board.findById(cls.boardId);
                            if (board) {
                                boardName = board.name;
                            }
                        }
                    }
                }
            }
        }

        console.log(`========================================================`);
        console.log(`Board: ${boardName} | Class: ${className} | Subject: ${subjectName}`);
        console.log(`Chapter: ${chapter.title} (ID: ${chapter._id})`);
        console.log(`========================================================`);
        
        const modules = await Module.find({ chapterId: chapter._id }).sort({ order: 1 });
        if (modules.length === 0) {
            console.log('  No modules found.');
        } else {
            modules.forEach((mod, index) => {
                console.log(`  Module ${index + 1}: ${mod.title}`);
            });
        }
        console.log('\n');
    }

  } catch (err) {
    console.error(err);
  } finally {
    mongoose.disconnect();
  }
}

listAllFoodChapters();
