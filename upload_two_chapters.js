import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import Papa from 'papaparse';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

import Board from './models/Board.js';
import ClassLevel from './models/ClassLevel.js';
import Subject from './models/Subject.js';
import Chapter from './models/Chapter.js';
import Unit from './models/Unit.js';
import Module from './models/Module.js';
import CurriculumItem from './models/CurriculumItem.js';
import DefaultRevisionQuestion from './models/DefaultRevisionQuestion.js';

const CHAPTER_CONFIGS = [
  {
    filePath: 'D:/Journey of water.xlsx - Sheet upload - 22nd sept akshit.csv',
    defaultBoard: 'CBSE',
    defaultClass: '6',
    defaultSubject: 'Science',
    targetOrder: 8,
    cleanChapterTitle: 'Chapter 8: A Journey through States of Water',
    targetTitleKeywords: ['states of water', 'journey of water', 'journey through states']
  },
  {
    filePath: 'D:/Time and Motion_Latest - Akshit Upload.csv',
    defaultBoard: 'CBSE',
    defaultClass: '7',
    defaultSubject: 'Science',
    targetOrder: 8,
    cleanChapterTitle: 'Chapter 8: Measurement of Time and Motion',
    targetTitleKeywords: ['time and motion', 'measurement of time']
  }
];

async function processChapterUpload(config) {
  console.log(`\n======================================================`);
  console.log(`📂 Processing: ${path.basename(config.filePath)}`);
  console.log(`   Target: ${config.defaultBoard} | Class ${config.defaultClass} | ${config.defaultSubject}`);
  console.log(`   Chapter: "${config.cleanChapterTitle}" (Order: ${config.targetOrder})`);
  console.log(`======================================================`);

  if (!fs.existsSync(config.filePath)) {
    throw new Error(`File does not exist: ${config.filePath}`);
  }

  const csvContent = fs.readFileSync(config.filePath, 'utf8');
  const parsed = Papa.parse(csvContent, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (h) => h.trim()
  });

  const rows = parsed.data;
  console.log(`📊 Total raw rows in CSV: ${rows.length}`);

  if (rows.length === 0) {
    throw new Error('CSV is completely empty');
  }

  const headers = Object.keys(rows[0]);
  console.log(`🏷️ Headers found:`, headers);

  const getCol = (row, partialNames) => {
    const key = headers.find(h => partialNames.some(p => h.toLowerCase() === p.toLowerCase() || h.toLowerCase().includes(p.toLowerCase())));
    return key ? String(row[key] || '') : '';
  };

  const getImgCols = (row) => {
    return headers
      .filter(h => h.toLowerCase().includes('image'))
      .map(k => String(row[k] || '').trim())
      .filter(Boolean);
  };

  // --- 1. Validation & Extraction ---
  const validItems = [];
  const lessonStats = {};
  let emptyRowCount = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;

    const isRowEmpty = Object.values(row).every(v => !String(v).trim() || String(v).trim() === '0');
    if (isRowEmpty) {
      emptyRowCount++;
      continue;
    }

    const boardName = (getCol(row, ['board']) || config.defaultBoard).trim();
    const className = String(getCol(row, ['class']) || config.defaultClass).trim();
    const subjectName = (getCol(row, ['subject']) || config.defaultSubject).trim();

    const rawChapter = getCol(row, ['chapter']).trim().replace(/[\r\n]+/g, ' ');
    const rawUnit = getCol(row, ['unit name', 'unit_name', 'unit']).trim().replace(/[\r\n]+/g, ' ');
    const rawLesson = getCol(row, ['lesson name', 'lesson title', 'lesson_name', 'lesson_title', 'lesson']).trim().replace(/[\r\n]+/g, ' ');
    const rawType = getCol(row, ['card type', 'type']).trim().toLowerCase();

    if (!rawLesson) {
      emptyRowCount++;
      continue;
    }

    const conceptText = getCol(row, ['concept', 'statement']).trim();
    const questionText = getCol(row, ['question']).trim();
    const answerText = getCol(row, ['answer']).trim();
    const optionsRaw = getCol(row, ['options', 'words']).trim();
    const reviseVal = getCol(row, ['revise']).trim().toLowerCase();
    const images = getImgCols(row);

    // Normalize type
    let normalizedType = 'statement';
    if (rawType.includes('comic')) normalizedType = 'comic';
    else if (rawType.includes('concept') || rawType.includes('statement') || rawType === 'text') normalizedType = 'concept';
    else if (rawType.includes('fib') || rawType.includes('fill')) normalizedType = 'fill-in-the-blank';
    else if (rawType.includes('mcq') || rawType.includes('choice')) normalizedType = 'multiple-choice';
    else if (rawType.includes('rearrange') || rawType.includes('re-arrange')) normalizedType = 'rearrange';

    // Parse options
    let opts = optionsRaw ? optionsRaw.split(',').map(o => o.trim()).filter(Boolean) : [];

    // Normalization for MCQ
    if (normalizedType === 'multiple-choice') {
      if (answerText && opts.length > 0) {
        // Find match ignoring trailing periods and case
        const cleanAns = answerText.replace(/\.+$/, '').trim().toLowerCase();
        const found = opts.find(o => o.replace(/\.+$/, '').trim().toLowerCase() === cleanAns);
        if (found) {
          // Normalize answer to match found option
        } else {
          console.warn(`[Auto-Fix] Row ${rowNum} MCQ: Appending missing answer "${answerText}" to options.`);
          opts.push(answerText);
        }
      }
    }

    const itemDoc = {
      rowNum,
      boardName,
      className,
      subjectName,
      chapterTitle: config.cleanChapterTitle,
      unitTitle: rawUnit || 'Unit 1',
      moduleTitle: rawLesson,
      type: normalizedType,
      text: conceptText || questionText,
      question: questionText || conceptText,
      answer: answerText,
      options: opts,
      words: normalizedType === 'rearrange' ? opts : [],
      images,
      imageUrl: images[0] || null,
      revise: reviseVal === 'y' || reviseVal === 'yes'
    };

    if (!lessonStats[rawLesson]) lessonStats[rawLesson] = { count: 0, types: {} };
    lessonStats[rawLesson].count++;
    lessonStats[rawLesson].types[normalizedType] = (lessonStats[rawLesson].types[normalizedType] || 0) + 1;

    validItems.push(itemDoc);
  }

  console.log(`✅ Extracted ${validItems.length} valid cards (${emptyRowCount} separator/blank rows skipped).`);
  console.log(`📚 Modules found (${Object.keys(lessonStats).length}):`);
  for (const [mName, stats] of Object.entries(lessonStats)) {
    console.log(`   - "${mName}": ${stats.count} cards | Types:`, stats.types);
  }

  // --- 2. Database Insertion ---
  console.log(`\n💾 Resolving Database Records...`);

  // Board
  let board = await Board.findOne({ name: config.defaultBoard });
  if (!board) board = await Board.create({ name: config.defaultBoard });

  // Class
  let cls = await ClassLevel.findOne({ boardId: board._id, name: config.defaultClass });
  if (!cls) cls = await ClassLevel.create({ boardId: board._id, name: config.defaultClass });

  // Subject
  let subject = await Subject.findOne({ boardId: board._id, classId: cls._id, name: config.defaultSubject });
  if (!subject) subject = await Subject.create({ boardId: board._id, classId: cls._id, name: config.defaultSubject, order: 1 });

  // Chapter: Match existing placeholder by order or keywords
  let chapter = await Chapter.findOne({ subjectId: subject._id, order: config.targetOrder });
  if (!chapter) {
    for (const kw of config.targetTitleKeywords) {
      chapter = await Chapter.findOne({ subjectId: subject._id, title: new RegExp(kw, 'i') });
      if (chapter) break;
    }
  }

  if (chapter) {
    console.log(`📌 Found existing Chapter [Order ${chapter.order}]: "${chapter.title}"`);
    chapter.title = config.cleanChapterTitle;
    chapter.order = config.targetOrder;
    await chapter.save();
    console.log(`   ✨ Updated title to: "${chapter.title}"`);
  } else {
    chapter = await Chapter.create({
      subjectId: subject._id,
      title: config.cleanChapterTitle,
      order: config.targetOrder
    });
    console.log(`📌 Created new Chapter [Order ${chapter.order}]: "${chapter.title}"`);
  }

  // Unit
  const targetUnitTitle = validItems[0]?.unitTitle || 'Unit 1';
  let unit = await Unit.findOne({ chapterId: chapter._id, title: targetUnitTitle });
  if (!unit) {
    unit = await Unit.create({
      chapterId: chapter._id,
      title: targetUnitTitle,
      order: 1
    });
    console.log(`📌 Created Unit [Order 1]: "${unit.title}"`);
  } else {
    console.log(`📌 Found Unit [Order ${unit.order}]: "${unit.title}"`);
  }

  // Modules: Maintain strictly the sequence from the CSV!
  const uniqueLessonsInOrder = [];
  for (const item of validItems) {
    if (!uniqueLessonsInOrder.includes(item.moduleTitle)) {
      uniqueLessonsInOrder.push(item.moduleTitle);
    }
  }

  const moduleMap = {};
  for (let idx = 0; idx < uniqueLessonsInOrder.length; idx++) {
    const modTitle = uniqueLessonsInOrder[idx];
    const modOrder = idx + 1;

    let mod = await Module.findOne({ chapterId: chapter._id, unitId: unit._id, title: modTitle });
    if (!mod) {
      mod = await Module.create({
        chapterId: chapter._id,
        unitId: unit._id,
        title: modTitle,
        order: modOrder
      });
      console.log(`   Created Module [${modOrder}]: "${modTitle}" (ID: ${mod._id})`);
    } else {
      mod.order = modOrder;
      await mod.save();
      console.log(`   Updated Module [${modOrder}]: "${modTitle}" (ID: ${mod._id})`);
    }
    moduleMap[modTitle] = mod;

    // Clean existing curriculum items & revision questions for this module to avoid duplicate accumulation
    await CurriculumItem.deleteMany({ moduleId: mod._id });
    await DefaultRevisionQuestion.deleteMany({ moduleId: mod._id });
  }

  // Insert Curriculum Items
  console.log(`\n📥 Inserting ${validItems.length} CurriculumItems and DefaultRevisionQuestions...`);
  const moduleCardIndex = {};
  let insertedItems = 0;
  let insertedRevision = 0;

  for (const item of validItems) {
    const mod = moduleMap[item.moduleTitle];
    if (!moduleCardIndex[mod._id]) moduleCardIndex[mod._id] = 1;
    const currentCardOrder = moduleCardIndex[mod._id]++;

    const dbItem = {
      moduleId: mod._id,
      order: currentCardOrder,
      type: item.type,
      text: item.text,
      question: item.question,
      options: item.options,
      answer: item.answer,
      words: item.words,
      imageUrl: item.imageUrl,
      images: item.images
    };

    await CurriculumItem.create(dbItem);
    insertedItems++;

    if (item.revise) {
      await DefaultRevisionQuestion.create({
        boardId: board._id,
        classId: cls._id,
        subjectId: subject._id,
        chapterId: chapter._id,
        unitId: unit._id,
        moduleId: mod._id,
        lessonIndex: currentCardOrder,
        type: item.type,
        question: item.question,
        text: item.text,
        options: item.options,
        answer: item.answer,
        words: item.words,
        images: item.images,
        order: currentCardOrder,
        active: true
      });
      insertedRevision++;
    }
  }

  console.log(`🎉 Finished ${config.cleanChapterTitle}:`);
  console.log(`   - CurriculumItems: ${insertedItems}`);
  console.log(`   - DefaultRevisionQuestions: ${insertedRevision}`);
  console.log(`   - Modules: ${uniqueLessonsInOrder.length}`);
}

async function main() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB successfully.");

    for (const cfg of CHAPTER_CONFIGS) {
      await processChapterUpload(cfg);
    }

    console.log("\n======================================================");
    console.log("🏁 ALL CHAPTER UPLOADS COMPLETED SUCCESSFULLY!");
    console.log("======================================================");
    process.exit(0);
  } catch (err) {
    console.error("❌ Fatal upload error:", err);
    process.exit(1);
  }
}

main();
