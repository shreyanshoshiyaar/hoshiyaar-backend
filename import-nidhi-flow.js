import mongoose from 'mongoose';
import fs from 'fs';
import dotenv from 'dotenv';
import Board from './models/Board.js';
import ClassLevel from './models/ClassLevel.js';
import Subject from './models/Subject.js';
import Chapter from './models/Chapter.js';
import Unit from './models/Unit.js';
import Module from './models/Module.js';
import CurriculumItem from './models/CurriculumItem.js';

dotenv.config();

// Custom robust CSV line parser that handles quoted commas correctly
function parseCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result.map(val => {
    // Strip leading/trailing quotes
    if (val.startsWith('"') && val.endsWith('"')) {
      return val.slice(1, -1).trim();
    }
    return val;
  });
}

async function importNidhiFlow() {
  const filePath = 'D:\\Mindful eating - A path to a healthy body - Nidhi Flow 2.csv';
  
  if (!fs.existsSync(filePath)) {
    console.error(`❌ CSV File not found at path: ${filePath}`);
    process.exit(1);
  }

  // Connect to MongoDB
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/hoshiyaar';
  console.log('🔄 Connecting to MongoDB...');
  await mongoose.connect(mongoUri);
  console.log('✅ Connected to MongoDB');

  // Read CSV file contents
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split(/\r?\n/).filter(line => line.trim() !== '');

  // Skip header line
  const dataLines = lines.slice(1);
  console.log(`📊 Found ${dataLines.length} rows to import.`);

  const clearedModules = new Set();
  const orderCounters = {};

  for (let i = 0; i < dataLines.length; i++) {
    const columns = parseCsvLine(dataLines[i]);
    if (columns.length < 4) continue;

    const [
      chapterTitle,
      unitTitle,
      lessonTitle,
      typeStr,
      conceptText,
      questionText,
      optionsStr,
      answerText
    ] = columns;

    if (!chapterTitle || !unitTitle || !lessonTitle) {
      continue;
    }

    // 1. Resolve Board (CBSE)
    let board = await Board.findOne({ name: 'CBSE' });
    if (!board) {
      board = await Board.create({ name: 'CBSE', slug: 'cbse' });
      console.log('Created Board: CBSE');
    }

    // 2. Resolve ClassLevel (Class 6)
    let classLevel = await ClassLevel.findOne({ boardId: board._id, name: '6' });
    if (!classLevel) {
      classLevel = await ClassLevel.create({ boardId: board._id, name: '6', order: 6 });
      console.log('Created Class: 6');
    }

    // 3. Resolve Subject (Science)
    let subject = await Subject.findOne({ boardId: board._id, classId: classLevel._id, name: 'Science' });
    if (!subject) {
      subject = await Subject.create({ boardId: board._id, classId: classLevel._id, name: 'Science', icon: 'book' });
      console.log('Created Subject: Science');
    }

    // 4. Resolve Chapter
    let chapter = await Chapter.findOne({ subjectId: subject._id, title: chapterTitle });
    if (!chapter) {
      chapter = await Chapter.create({ subjectId: subject._id, title: chapterTitle, order: 1 });
      console.log(`Created Chapter: ${chapterTitle}`);
    }

    // 5. Resolve Unit
    let unit = await Unit.findOne({ chapterId: chapter._id, title: unitTitle });
    if (!unit) {
      unit = await Unit.create({ chapterId: chapter._id, title: unitTitle, order: 1 });
      console.log(`Created Unit: ${unitTitle}`);
    }

    // 6. Resolve Module (Lesson)
    let module = await Module.findOne({ chapterId: chapter._id, unitId: unit._id, title: lessonTitle });
    if (!module) {
      module = await Module.create({ chapterId: chapter._id, unitId: unit._id, title: lessonTitle, order: 1 });
      console.log(`Created Module (Lesson): ${lessonTitle}`);
    }

    // Clear existing items for this module once to avoid duplicate content on re-run
    const modIdStr = String(module._id);
    if (!clearedModules.has(modIdStr)) {
      await CurriculumItem.deleteMany({ moduleId: module._id });
      console.log(`🧹 Cleared existing items for Lesson: ${lessonTitle}`);
      clearedModules.add(modIdStr);
    }

    // Track sequential order
    if (!orderCounters[modIdStr]) {
      orderCounters[modIdStr] = 1;
    }
    const currentOrder = orderCounters[modIdStr]++;

    // 7. Map Type
    let type = typeStr.trim().toLowerCase();
    if (type === 'mcq') {
      type = 'multiple-choice';
    } else if (type === 'fib') {
      type = 'fill-in-the-blank';
    } else if (type === 're-arrange') {
      type = 'rearrange';
    } else if (type === 'comic') {
      type = 'comic';
    } else if (type === 'video') {
      type = 'video';
    } else if (type === 'concept') {
      type = 'concept';
    } else if (type === 'descriptive') {
      type = 'descriptive';
    }

    // 8. Prepare Item Document
    const itemDoc = {
      moduleId: module._id,
      order: currentOrder,
      type: type,
      images: []
    };

    // Map Options
    if (optionsStr) {
      itemDoc.options = optionsStr.split(',').map(s => s.trim()).filter(Boolean);
      if (type === 'rearrange') {
        itemDoc.words = itemDoc.options;
      }
    } else {
      itemDoc.options = [];
    }

    // Map Answer
    if (answerText) {
      itemDoc.answer = answerText.trim();
    }

    // Map Text / Question based on type
    if (type === 'concept' || type === 'comic' || type === 'video') {
      itemDoc.text = conceptText ? conceptText.trim() : (questionText ? questionText.trim() : '');
      if (type === 'video') {
        itemDoc.question = questionText ? questionText.trim() : '';
      }
    } else {
      itemDoc.question = questionText ? questionText.trim() : '';
      if (conceptText) {
        itemDoc.text = conceptText.trim();
      }
    }

    // Gather Image/Video URLs starting with http or https
    const urls = [];
    columns.forEach(col => {
      if (typeof col === 'string' && (col.startsWith('http://') || col.startsWith('https://'))) {
        urls.push(col.trim());
      }
    });

    if (urls.length > 0) {
      itemDoc.images = urls;
      itemDoc.imageUrl = urls[0];
    }

    await CurriculumItem.create(itemDoc);
    console.log(`📥 Imported [${type}] into "${lessonTitle}" (Card #${currentOrder})`);
  }

  console.log('🎉 Curriculum import completed successfully!');
  await mongoose.disconnect();
  console.log('👋 Disconnected from MongoDB.');
}

importNidhiFlow().catch(err => {
  console.error('❌ Critical Error during import:', err);
  mongoose.disconnect();
});
