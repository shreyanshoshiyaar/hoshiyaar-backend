import mongoose from 'mongoose';
import fs from 'fs';
import dotenv from 'dotenv';
import Board from './models/Board.js';
import ClassLevel from './models/ClassLevel.js';
import Subject from './models/Subject.js';
import Chapter from './models/Chapter.js';
import Module from './models/Module.js';
import CurriculumItem from './models/CurriculumItem.js';

dotenv.config();

/**
 * Example CSV Format (comma-separated):
 * Board,Class,Subject,Chapter,Module,Type,Text/Question,Answer,Options(pipe-separated),Images(pipe-separated URLs)
 * CBSE,6,Science,Heat,Basic Heat,comic,,,|imgUrl1|imgUrl2
 * CBSE,6,Science,Heat,Basic Heat,multiple-choice,What is heat?,Energy,Energy|Force|Mass,
 */

async function importCsv() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.log("Usage: node import-csv-data.js <path-to-csv>");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(l => l.trim() !== '');

  // Skip header line
  const dataLines = lines.slice(1);

  let currentOrder = 1;
  let lastModuleId = null;

  for (let i = 0; i < dataLines.length; i++) {
    // Basic CSV splitting (does not handle quoted commas, use carefully or upgrade to a library like csv-parser if needed)
    const columns = dataLines[i].split(',').map(s => s.trim());
    if (columns.length < 6) continue;

    const [boardName, classTitle, subjectName, chapterTitle, moduleTitle, type, textOrQuestion, answer, optionsStr, imagesStr] = columns;

    // 1. Resolve Hierarchy (Find or Create)
    let board = await Board.findOne({ name: boardName });
    if (!board) board = await Board.create({ name: boardName, slug: boardName.toLowerCase().replace(/ /g, '-') });

    let cls = await ClassLevel.findOne({ name: classTitle, boardId: board._id });
    if (!cls) cls = await ClassLevel.create({ name: classTitle, boardId: board._id, order: parseInt(classTitle) || 0 });

    let subject = await Subject.findOne({ name: subjectName, classId: cls._id });
    if (!subject) subject = await Subject.create({ name: subjectName, classId: cls._id, icon: 'book' });

    let chapter = await Chapter.findOne({ title: chapterTitle, subjectId: subject._id });
    if (!chapter) chapter = await Chapter.create({ title: chapterTitle, subjectId: subject._id, order: 1 });

    let mod = await Module.findOne({ title: moduleTitle, chapterId: chapter._id });
    if (!mod) mod = await Module.create({ title: moduleTitle, chapterId: chapter._id, order: 1 });

    // Reset order if module changes
    if (String(mod._id) !== String(lastModuleId)) {
      currentOrder = 1;
      lastModuleId = mod._id;
    }

    // 2. Prepare Item
    const options = optionsStr ? optionsStr.split('|').filter(Boolean) : [];
    const images = imagesStr ? imagesStr.split('|').filter(Boolean) : [];

    const itemDoc = {
      moduleId: mod._id,
      order: currentOrder++,
      type: type.toLowerCase(), // 'comic', 'statement', 'multiple-choice', etc.
      images: images
    };

    if (type === 'comic' || type === 'statement') {
      itemDoc.text = textOrQuestion;
    } else if (['multiple-choice', 'fill-in-the-blank', 'rearrange'].includes(type)) {
      itemDoc.question = textOrQuestion;
      itemDoc.answer = answer;
      if (options.length > 0) {
        if (type === 'multiple-choice' && answer && !options.includes(answer)) {
          console.warn(`[Warning] MCQ Question "${textOrQuestion}": Correct answer "${answer}" was missing from options. Auto-fixing...`);
          options.push(answer);
        }
        itemDoc.options = options;
        if (type === 'rearrange') itemDoc.words = options;
      } else if (type === 'multiple-choice' && answer) {
        itemDoc.options = [answer];
      }
    }

    await CurriculumItem.create(itemDoc);
    console.log(`Imported ${type} into ${moduleTitle} (Order ${itemDoc.order})`);
  }

  console.log("Import complete!");
  mongoose.disconnect();
}

importCsv().catch(console.error);
