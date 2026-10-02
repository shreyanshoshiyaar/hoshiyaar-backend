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

const CONFIG = {
  filePath: 'D:/Nature of Matter - Akshit_upload 24 sept.csv',
  targetBoard: 'CBSE',
  targetClass: '8',
  targetSubject: 'Science',
  targetOrder: 8,
  cleanChapterTitle: 'Chapter 8: Nature of Matter: Elements, Compounds, and Mixtures',
  cleanUnitTitle: 'Elements, Compounds and Mixtures',
  onlyAdmins: true // isPublished: false
};

async function main() {
  console.log(`\n======================================================`);
  console.log(`🚀 Starting Upload: ${CONFIG.cleanChapterTitle}`);
  console.log(`   Target: ${CONFIG.targetBoard} | Class ${CONFIG.targetClass} | ${CONFIG.targetSubject}`);
  console.log(`   Visibility: ${CONFIG.onlyAdmins ? '🛡️ ONLY ADMINS (isPublished: false)' : '🌍 PUBLISHED'}`);
  console.log(`======================================================\n`);

  if (!fs.existsSync(CONFIG.filePath)) {
    throw new Error(`File not found: ${CONFIG.filePath}`);
  }

  const csvContent = fs.readFileSync(CONFIG.filePath, 'utf8');
  const parsed = Papa.parse(csvContent, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (h) => h.trim()
  });

  const rows = parsed.data;
  console.log(`📊 Total raw rows in CSV: ${rows.length}`);

  const headers = Object.keys(rows[0] || {});
  console.log(`🏷️ Headers found:`, headers);

  const getCol = (row, partialNames) => {
    const key = headers.find(h => partialNames.some(p => h.toLowerCase() === p.toLowerCase() || h.toLowerCase().includes(p.toLowerCase())));
    return key ? String(row[key] || '') : '';
  };

  const getImgUrls = (row) => {
    return headers
      .filter(h => h.toLowerCase().includes('image'))
      .map(k => String(row[k] || '').trim())
      .filter(v => v.startsWith('http://') || v.startsWith('https://'));
  };

  // --- 1. Validation & Data Extraction ---
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

    let rawLesson = getCol(row, ['lesson name', 'lesson title', 'lesson_name', 'lesson_title', 'lesson']).trim().replace(/[\r\n]+/g, ' ');
    if (!rawLesson) {
      emptyRowCount++;
      continue;
    }

    // Normalizations for lesson names to prevent fragmentation:
    // 1. "Elements &the periodic table" -> "Elements & the periodic table"
    rawLesson = rawLesson.replace(/\s*&\s*/g, ' & ').replace(/\s+/g, ' ').trim();

    // 2. Comic 81, 82, 83 labelled "Air and Water" inside Pure Substances
    if (rawLesson.toLowerCase() === 'air and water') {
      rawLesson = 'Pure Substances';
    }

    // Standardize colon spacing e.g. "Experiments Part : 1" -> "Experiments Part: 1"
    rawLesson = rawLesson.replace(/\s*:\s*/g, ': ');

    const rawType = getCol(row, ['card type', 'type']).trim().toLowerCase();
    const conceptText = getCol(row, ['concept', 'statement']).trim();
    const questionText = getCol(row, ['question']).trim();
    const answerText = getCol(row, ['answer']).trim();
    const optionsRaw = getCol(row, ['options', 'words']).trim();
    const reviseVal = getCol(row, ['revise']).trim().toLowerCase();
    const images = getImgUrls(row);

    // Normalize card type
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
        const cleanAns = answerText.replace(/\.+$/, '').trim().toLowerCase();
        const found = opts.find(o => o.replace(/\.+$/, '').trim().toLowerCase() === cleanAns);
        if (!found) {
          console.warn(`[Auto-Fix] Row ${rowNum} MCQ: Appending missing answer "${answerText}" to options.`);
          opts.push(answerText);
        }
      }
    }

    const itemDoc = {
      rowNum,
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

  console.log(`✅ Extracted ${validItems.length} valid cards (${emptyRowCount} empty/separator rows skipped).`);
  console.log(`📚 Modules found (${Object.keys(lessonStats).length}):`);
  for (const [mName, stats] of Object.entries(lessonStats)) {
    console.log(`   - "${mName}": ${stats.count} cards | Types:`, stats.types);
  }

  // --- 2. Database Operations ---
  console.log(`\n💾 Connecting to MongoDB...`);
  await mongoose.connect(process.env.MONGO_URI);
  console.log(`✅ Connected.`);

  // Hierarchy Resolution
  let board = await Board.findOne({ name: CONFIG.targetBoard });
  if (!board) board = await Board.create({ name: CONFIG.targetBoard });

  let cls = await ClassLevel.findOne({ boardId: board._id, name: CONFIG.targetClass });
  if (!cls) cls = await ClassLevel.create({ boardId: board._id, name: CONFIG.targetClass });

  let subject = await Subject.findOne({ boardId: board._id, classId: cls._id, name: CONFIG.targetSubject });
  if (!subject) subject = await Subject.create({ boardId: board._id, classId: cls._id, name: CONFIG.targetSubject, order: 1 });

  // Chapter: Match existing placeholder by order 8 or title keywords
  let chapter = await Chapter.findOne({ subjectId: subject._id, order: CONFIG.targetOrder });
  if (!chapter) {
    chapter = await Chapter.findOne({ subjectId: subject._id, title: /nature of matter/i });
  }

  if (chapter) {
    console.log(`📌 Found Chapter [Order ${chapter.order}]: "${chapter.title}"`);
    chapter.title = CONFIG.cleanChapterTitle;
    chapter.order = CONFIG.targetOrder;
    chapter.isPublished = !CONFIG.onlyAdmins; // false for only admins!
    await chapter.save();
    console.log(`   ✨ Updated title to: "${chapter.title}"`);
    console.log(`   🛡️ Set isPublished: ${chapter.isPublished} (Admin Only)`);
  } else {
    chapter = await Chapter.create({
      subjectId: subject._id,
      title: CONFIG.cleanChapterTitle,
      order: CONFIG.targetOrder,
      isPublished: !CONFIG.onlyAdmins
    });
    console.log(`📌 Created Chapter [Order ${chapter.order}]: "${chapter.title}"`);
    console.log(`   🛡️ Set isPublished: ${chapter.isPublished} (Admin Only)`);
  }

  // Unit
  let unit = await Unit.findOne({ chapterId: chapter._id, title: CONFIG.cleanUnitTitle });
  if (!unit) {
    unit = await Unit.create({
      chapterId: chapter._id,
      title: CONFIG.cleanUnitTitle,
      order: 1
    });
    console.log(`📌 Created Unit [Order 1]: "${unit.title}"`);
  } else {
    console.log(`📌 Found Unit [Order ${unit.order}]: "${unit.title}"`);
  }

  // Modules: Maintain strict sequential order
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

    // Clear any previous curriculum items & revision questions for this module
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

  console.log(`\n======================================================`);
  console.log(`🎉 UPLOAD COMPLETE SUCCESSFULLY!`);
  console.log(`   - Chapter: "${CONFIG.cleanChapterTitle}"`);
  console.log(`   - Visibility: ONLY ADMINS (isPublished: false)`);
  console.log(`   - Total Modules: ${uniqueLessonsInOrder.length}`);
  console.log(`   - Total CurriculumItems: ${insertedItems}`);
  console.log(`   - Total Revision Questions: ${insertedRevision}`);
  console.log(`======================================================\n`);

  process.exit(0);
}

main().catch(err => {
  console.error("❌ Fatal upload error:", err);
  process.exit(1);
});
