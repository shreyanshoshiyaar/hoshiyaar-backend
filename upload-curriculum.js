import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import Papa from 'papaparse';
import path from 'path';
import { fileURLToPath } from 'url';

// Adjust path depending on where the script is run
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

/**
 * Dedicated script to safely parse, validate, and upload curriculum CSVs.
 * Usage: node upload-curriculum.js <path-to-csv>
 * Example: node upload-curriculum.js "D:\data.csv"
 */

async function run() {
  const filePath = process.argv[2];

  if (!filePath) {
    console.error("❌ Usage: node upload-curriculum.js <path-to-csv>");
    process.exit(1);
  }

  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found at path: ${filePath}`);
    process.exit(1);
  }

  console.log(`\n🔍 Parsing CSV: ${filePath}`);
  const csvContent = fs.readFileSync(filePath, 'utf8');
  
  const parsed = Papa.parse(csvContent, { 
    header: true, 
    skipEmptyLines: true 
  });

  if (parsed.errors.length > 0) {
    console.error("❌ CSV Parsing Errors:", parsed.errors);
    process.exit(1);
  }

  const rows = parsed.data;
  if (rows.length === 0) {
    console.error("❌ CSV is empty.");
    process.exit(1);
  }

  // Identify Headers (Case-insensitive)
  const headers = Object.keys(rows[0]);
  const getCol = (row, partialNames) => {
    const key = headers.find(h => partialNames.some(p => h.toLowerCase().includes(p)));
    return key ? (row[key] || '') : '';
  };
  const getImgCols = (row) => headers.filter(h => h.toLowerCase().includes('image')).map(k => String(row[k] || '').trim()).filter(Boolean);

  // 1. Validation Phase (Dry-Run)
  console.log("\n🧪 Running Validation Checks...");
  let errors = 0;
  let warnings = 0;
  const validatedItems = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // +1 for 0-index, +1 for header

    const boardName = getCol(row, ['board']) || 'CBSE';
    const className = String(getCol(row, ['class']) || '6');
    const subjectName = getCol(row, ['subject']) || 'Science';
    const chapterTitle = getCol(row, ['chapter']);
    const unitTitle = getCol(row, ['unit_title', 'unit']) || 'Default Unit';
    let moduleTitle = getCol(row, ['lesson_title', 'module']);
    let rawType = getCol(row, ['type']);
    
    const isRowEmpty = Object.values(row).every(val => !String(val).trim());
    if (isRowEmpty) continue;

    if (!chapterTitle) {
      console.error(`[Error] Row ${rowNum}: Missing 'chapter' title.`);
      errors++;
      continue;
    }
    if (!moduleTitle) {
      console.error(`[Error] Row ${rowNum}: Missing 'lesson_title' (module).`);
      errors++;
      continue;
    }
    if (!rawType) {
      console.error(`[Error] Row ${rowNum}: Missing 'type'.`);
      errors++;
      continue;
    }

    if (moduleTitle.trim().toLowerCase() === 'difficult module') {
      moduleTitle = 'HOT MODULE';
    }

    let typeStr = rawType.toLowerCase().trim();
    if (typeStr === 'statement' || typeStr === 'text') typeStr = 'concept';
    else if (typeStr === 're-arrange') typeStr = 'rearrange';
    else if (typeStr === 'fill-in-the-blank' || typeStr === 'fib') typeStr = 'fill-in-the-blank';
    else if (typeStr.includes('mcq')) typeStr = 'multiple-choice';

    const conceptText = getCol(row, ['concept', 'statement']).trim();
    const questionText = getCol(row, ['question']).trim();
    const answerText = getCol(row, ['answer']).trim();
    const keywordsText = getCol(row, ['keyword']).trim(); // For descriptive questions
    const optionsRaw = getCol(row, ['options', 'words']).trim();
    const reviseVal = getCol(row, ['revise']).trim().toLowerCase();
    const images = getImgCols(row);

    const doc = {
      boardName,
      className,
      subjectName,
      chapterTitle,
      unitTitle,
      moduleTitle,
      type: typeStr,
      question: questionText || conceptText,
      text: conceptText || questionText,
      answer: answerText,
      keywordsRaw: keywordsText || answerText, // Fallback to answer column if keywords column is empty
      images,
      revise: reviseVal === 'y' || reviseVal === 'yes'
    };

    // --- CHECK: Background Images ---
    for (const img of images) {
      if (!img.startsWith('http://') && !img.startsWith('https://')) {
        console.warn(`[Warning] Row ${rowNum} (${typeStr}): Image URL does not start with http/https -> "${img}"`);
        warnings++;
      }
    }

    // --- CHECK: Descriptive Questions ---
    if (typeStr === 'descriptive') {
      if (!doc.question) {
        console.error(`[Error] Row ${rowNum} (Descriptive): Missing Question text.`);
        errors++;
      }
      if (!conceptText && !doc.keywordsRaw) {
        console.warn(`[Warning] Row ${rowNum} (Descriptive): Missing Model Answer/Keywords.`);
        warnings++;
      }
      doc.modelAnswers = conceptText ? [conceptText] : [];
      doc.keywords = doc.keywordsRaw ? doc.keywordsRaw.split(',').map(s => s.trim()).filter(Boolean) : [];
    }
    // --- CHECK: Fill In The Blanks ---
    else if (typeStr === 'fill-in-the-blank') {
      if (!doc.question) {
        console.warn(`[Warning] Row ${rowNum} (FIB): Missing Question.`);
        warnings++;
      }
      if (!doc.answer) {
        console.error(`[Error] Row ${rowNum} (FIB): Missing Answer! FIB must have an answer.`);
        errors++;
      }
    }
    // --- CHECK: MCQ ---
    else if (typeStr === 'multiple-choice') {
      if (!doc.question) {
        console.warn(`[Warning] Row ${rowNum} (MCQ): Missing Question.`);
        warnings++;
      }
      
      let opts = optionsRaw ? optionsRaw.split(',').map(s => s.trim()).filter(Boolean) : [];
      
      // Auto-fix options if missing correct answer
      if (doc.answer && opts.length > 0) {
        const matchingOpt = opts.find(o => o.toLowerCase() === doc.answer.toLowerCase());
        if (!matchingOpt) {
          console.warn(`[Warning] Row ${rowNum} (MCQ): Correct answer "${doc.answer}" not found in options. Auto-fixing by appending it.`);
          opts.push(doc.answer);
          warnings++;
        } else {
          doc.answer = matchingOpt; // Keep casing consistent
        }
      } else if (!doc.answer) {
        console.error(`[Error] Row ${rowNum} (MCQ): Missing Answer.`);
        errors++;
      }
      doc.options = opts;
    }
    // --- CHECK: Rearrange ---
    else if (typeStr === 'rearrange') {
      let opts = optionsRaw ? optionsRaw.split(',').map(s => s.trim()).filter(Boolean) : [];
      doc.words = opts;
      doc.options = opts;
      if (!doc.answer) {
        console.warn(`[Warning] Row ${rowNum} (Rearrange): Missing correct Answer sequence.`);
        warnings++;
      }
    }
    // --- CHECK: Comic / Concept / Video ---
    else if (['concept', 'comic', 'video'].includes(typeStr)) {
      if (!doc.text) {
        console.warn(`[Warning] Row ${rowNum} (${typeStr}): Missing text/concept content.`);
        warnings++;
      }
      if (typeStr === 'comic') {
        doc.imageUrl = images[0];
        if (images.length === 0) {
          console.warn(`[Warning] Row ${rowNum} (Comic): Comic type without images.`);
          warnings++;
        }
      } else if (typeStr === 'video') {
        doc.videoUrl = images[0] || doc.question; 
        doc.imageUrl = images[0];
        if (!doc.videoUrl) {
          console.warn(`[Warning] Row ${rowNum} (Video): Video type without a Video URL.`);
          warnings++;
        }
      }
    } else {
      console.warn(`[Warning] Row ${rowNum}: Unknown type "${typeStr}". Processing as statement.`);
      typeStr = 'statement';
      doc.type = 'statement';
      warnings++;
    }

    validatedItems.push(doc);
  }

  console.log(`\n✅ Validation Complete. Found ${errors} Errors and ${warnings} Warnings.`);
  if (errors > 0) {
    console.error("🛑 Upload aborted due to errors. Please fix the CSV and run again.");
    process.exit(1);
  }

  // 2. Upload Phase
  console.log("\n🚀 Connecting to MongoDB and starting upload...");
  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ Connected to DB.");

  const clearedModules = new Set();
  const oldItemsMap = {};
  const orderCounters = {}; // moduleId -> next question order
  const moduleOrderCounters = {}; // unitId -> next module order
  const seenModules = new Set(); 
  const unitOrderCounters = {}; // chapterId -> next unit order
  const seenUnits = new Set();

  let uploadedCount = 0;
  let reviseCount = 0;

  // Cache to avoid hitting DB for every row for the same board/class/subject/chapter
  const hierarchyCache = { boards: {}, classes: {}, subjects: {}, chapters: {} };

  for (const item of validatedItems) {
    // Resolve Hierarchy
    if (!hierarchyCache.boards[item.boardName]) {
      let b = await Board.findOne({ name: item.boardName });
      if (!b) b = await Board.create({ name: item.boardName });
      hierarchyCache.boards[item.boardName] = b;
    }
    const board = hierarchyCache.boards[item.boardName];

    const classKey = `${board._id}-${item.className}`;
    if (!hierarchyCache.classes[classKey]) {
      let c = await ClassLevel.findOne({ boardId: board._id, name: item.className });
      if (!c) c = await ClassLevel.create({ boardId: board._id, name: item.className });
      hierarchyCache.classes[classKey] = c;
    }
    const cls = hierarchyCache.classes[classKey];

    const subjKey = `${cls._id}-${item.subjectName}`;
    if (!hierarchyCache.subjects[subjKey]) {
      let s = await Subject.findOne({ boardId: board._id, classId: cls._id, name: item.subjectName });
      if (!s) s = await Subject.create({ boardId: board._id, classId: cls._id, name: item.subjectName, order: 1 });
      hierarchyCache.subjects[subjKey] = s;
    }
    const subject = hierarchyCache.subjects[subjKey];

    const chapKey = `${subject._id}-${item.chapterTitle}`;
    if (!hierarchyCache.chapters[chapKey]) {
      let ch = await Chapter.findOne({ subjectId: subject._id, title: new RegExp(`^${item.chapterTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i') });
      if (!ch) ch = await Chapter.create({ subjectId: subject._id, title: item.chapterTitle, order: 99 });
      hierarchyCache.chapters[chapKey] = ch;
    }
    const chapter = hierarchyCache.chapters[chapKey];

    // Resolve Unit
    const chapIdStr = String(chapter._id);
    if (!unitOrderCounters[chapIdStr]) unitOrderCounters[chapIdStr] = 1;
    
    let unit = await Unit.findOne({ chapterId: chapter._id, title: item.unitTitle });
    if (!unit) {
      unit = await Unit.create({ chapterId: chapter._id, title: item.unitTitle, order: unitOrderCounters[chapIdStr] });
    } else if (!seenUnits.has(String(unit._id))) {
      unit.order = unitOrderCounters[chapIdStr];
      await unit.save();
    }
    
    if (!seenUnits.has(String(unit._id))) {
      seenUnits.add(String(unit._id));
      unitOrderCounters[chapIdStr]++;
    }

    // Resolve Module
    const unitIdStr = String(unit._id);
    if (!moduleOrderCounters[unitIdStr]) moduleOrderCounters[unitIdStr] = 1;

    let mod = await Module.findOne({ chapterId: chapter._id, unitId: unit._id, title: item.moduleTitle });
    if (!mod) {
      mod = await Module.create({ chapterId: chapter._id, unitId: unit._id, title: item.moduleTitle, order: moduleOrderCounters[unitIdStr] });
    } else if (!seenModules.has(String(mod._id))) {
      mod.order = moduleOrderCounters[unitIdStr];
      await mod.save();
    }

    if (!seenModules.has(String(mod._id))) {
      seenModules.add(String(mod._id));
      moduleOrderCounters[unitIdStr]++;
    }

    const modIdStr = String(mod._id);

    // Clear module if it's the first time we see it in this script run, but save old items first!
    if (!clearedModules.has(modIdStr)) {
       const existingItems = await CurriculumItem.find({ moduleId: mod._id });
       oldItemsMap[modIdStr] = existingItems;
       
       await CurriculumItem.deleteMany({ moduleId: mod._id });
       await DefaultRevisionQuestion.deleteMany({ moduleId: mod._id });
       clearedModules.add(modIdStr);
    }

    if (!orderCounters[modIdStr]) orderCounters[modIdStr] = 1;
    const currentOrder = orderCounters[modIdStr]++;

    // RETAIN BACKGROUND IMAGES: If CSV doesn't provide images, try to find the matching old item
    if (!item.images || item.images.length === 0) {
      const existingItems = oldItemsMap[modIdStr] || [];
      // Match by exact question/text, fallback to matching by order index
      const oldItem = existingItems.find(e => 
        (e.question && e.question === item.question) || 
        (e.text && e.text === item.text)
      ) || existingItems.find(e => e.order === currentOrder);

      if (oldItem && oldItem.images && oldItem.images.length > 0) {
        item.images = oldItem.images;
        item.imageUrl = oldItem.imageUrl;
        item.videoUrl = oldItem.videoUrl;
      }
    }

    // Create CurriculumItem
    const dbItem = {
      moduleId: mod._id,
      order: currentOrder,
      type: item.type,
      question: item.question,
      text: item.text,
      answer: item.answer,
      options: item.options,
      words: item.words,
      images: item.images,
      imageUrl: item.imageUrl,
      videoUrl: item.videoUrl,
      modelAnswers: item.modelAnswers,
      keywords: item.keywords
    };

    await CurriculumItem.create(dbItem);
    uploadedCount++;

    // Add to Revision pool if required
    if (item.revise) {
      await DefaultRevisionQuestion.create({
        boardId: board._id,
        classId: cls._id,
        subjectId: subject._id,
        chapterId: chapter._id,
        unitId: unit._id,
        moduleId: mod._id,
        lessonIndex: currentOrder,
        type: item.type,
        question: item.question,
        text: item.text,
        options: item.options,
        answer: item.answer,
        words: item.words,
        images: item.images,
        order: currentOrder
      });
      reviseCount++;
    }
  }

  console.log(`\n🎉 Success! Uploaded ${uploadedCount} items. Added ${reviseCount} to Revision.`);
  process.exit(0);
}

run().catch(err => {
  console.error("❌ Fatal Error:", err);
  process.exit(1);
});
