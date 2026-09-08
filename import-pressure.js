import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Papa from 'papaparse';

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

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
const DEFAULT_CSV = 'D:\\Pressure - akshit upload - 11 aug (1).csv';

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const csvArg = args.find(a => !a.startsWith('--'));
const CSV_FILE = csvArg || DEFAULT_CSV;

function parseOptions(optionsStr, answerText) {
  if (!optionsStr) return [];

  if (optionsStr.includes(';')) {
    return optionsStr.split(';').map(s => s.trim()).filter(Boolean);
  }

  const simpleOpts = optionsStr.split(',').map(s => s.trim()).filter(Boolean);

  if (!answerText || simpleOpts.some(o => o.toLowerCase() === answerText.trim().toLowerCase())) {
    return simpleOpts;
  }

  const ansTrim = answerText.trim();
  const lowerOptions = optionsStr.toLowerCase();
  const lowerAns = ansTrim.toLowerCase();
  const ansIdx = lowerOptions.indexOf(lowerAns);

  if (ansIdx !== -1) {
    const before = optionsStr.substring(0, ansIdx).trim().replace(/^[,\s]+|[,\s]+$/g, '');
    const after = optionsStr.substring(ansIdx + ansTrim.length).trim().replace(/^[,\s]+|[,\s]+$/g, '');
    
    const result = [];
    if (before) {
      before.split(',').map(s => s.trim()).filter(Boolean).forEach(s => result.push(s));
    }
    result.push(ansTrim);
    if (after) {
      after.split(',').map(s => s.trim()).filter(Boolean).forEach(s => result.push(s));
    }
    return result;
  }

  // Row 39 edge-case or close match:
  // Check if an option starts with the answer or answer starts with an option
  const fuzzyMatch = simpleOpts.find(o => 
    lowerAns.includes(o.toLowerCase()) || o.toLowerCase().includes(lowerAns)
  );
  if (fuzzyMatch) {
    return simpleOpts;
  }

  return simpleOpts;
}

async function run() {
  console.log(`\n📂 Loading CSV: ${CSV_FILE}`);
  if (!fs.existsSync(CSV_FILE)) {
    console.error(`❌ Could not find CSV file at ${CSV_FILE}`);
    process.exit(1);
  }

  const content = fs.readFileSync(CSV_FILE, 'utf-8');

  const headerCounts = {};
  const parsed = Papa.parse(content, {
    header: true,
    skipEmptyLines: true,
    transformHeader: function (header, index) {
      if (index === 0) {
        for (const k in headerCounts) delete headerCounts[k];
      }
      const h = header.trim().toLowerCase();
      if (!headerCounts[h]) {
        headerCounts[h] = 1;
        return h;
      } else {
        return `ignore_duplicate_${Math.random()}`;
      }
    }
  });

  const rows = parsed.data;
  console.log(`📊 Found ${rows.length} rows in CSV.`);

  if (isDryRun) {
    console.log(`\n🧪 DRY-RUN MODE: Validation only, no database changes will be made.\n`);
  } else {
    if (!MONGO_URI) {
      console.error("❌ MONGO_URI not found in environment.");
      process.exit(1);
    }
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB.");
  }

  const chapterTitle = 'Chapter 6: Pressure, Winds, Storms, and Cyclones';
  let targetChapter = null;
  let boardId = null;
  let classId = null;
  let subjectId = null;

  if (!isDryRun) {
    let board = await Board.findOne({ name: /CBSE/i });
    if (!board) board = await Board.create({ name: 'CBSE' });
    boardId = board._id;

    let cls = await ClassLevel.findOne({ boardId: board._id, name: '8' });
    if (!cls) cls = await ClassLevel.create({ boardId: board._id, name: '8' });
    classId = cls._id;

    let subject = await Subject.findOne({ boardId: board._id, classId: cls._id, name: /Science/i });
    if (!subject) subject = await Subject.create({ boardId: board._id, classId: cls._id, name: 'Science', order: 1 });
    subjectId = subject._id;

    targetChapter = await Chapter.findOne({
      subjectId: subject._id,
      $or: [
        { title: chapterTitle },
        { title: /Pressure/i }
      ]
    });

    if (targetChapter) {
      console.log(`✅ Found existing Chapter: "${targetChapter.title}" (ID: ${targetChapter._id})`);
      targetChapter.title = chapterTitle;
      targetChapter.order = 6;
      targetChapter.isPublished = false; // Admins Only mode during/after import
      await targetChapter.save();
      console.log(`🔒 Updated title to "${chapterTitle}", order to 6 & set to unpublished (Admins Only).`);
    } else {
      console.log(`⚠️ Creating new chapter "${chapterTitle}" in CBSE Class 8 Science...`);
      targetChapter = await Chapter.create({
        subjectId: subject._id,
        title: chapterTitle,
        order: 6,
        isPublished: false
      });
      console.log(`🔒 Created chapter and set to unpublished (Admins Only).`);
    }
  }

  const validUnitIds = new Set();
  const validModuleIds = new Set();
  const clearedModules = new Set();
  const orderCounters = {};
  const unitModuleOrderCounters = {};
  const unitOrderMap = {};
  let unitOrderCounter = 1;

  let currentLessonTitle = null;
  let currentUnitTitle = null;
  let currentModuleId = null;

  let processedCount = 0;
  let skippedCount = 0;
  const issuesFound = [];
  const unitSummary = {};

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;

    let rawType = (row['type'] || '').trim().toLowerCase();
    const conceptText = (row['concept'] || row['concept/statement'] || row['statement'] || '').trim();
    let questionText = (row['question'] || row['questions'] || '').trim();
    let optionsStr = (row['options'] || '').trim();
    let answerText = (row['answer'] || row['answers'] || '').trim();
    const lessonTitle = (row['lesson name'] || row['lesson_title'] || row['lesson title'] || row['lesson'] || '').trim();
    const unitTitleRaw = (row['unit name'] || row['unit_title'] || row['unit title'] || row['unit'] || 'Default Unit').trim();
    const reviseVal = (row['revise'] || row['revise?'] || '').trim().toLowerCase();

    // Collect image URLs from any column containing 'image'
    const images = [];
    Object.keys(row).forEach(k => {
      if (k.toLowerCase().includes('image')) {
        const val = (row[k] || '').trim();
        if (val.startsWith('http') && !images.includes(val)) {
          images.push(val);
        }
      }
    });

    // Skip empty spacer rows
    if (!rawType && !conceptText && !questionText && !lessonTitle) {
      continue;
    }

    // Auto-infer MCQ if type is missing but options and answer exist (e.g. Row 409)
    if (!rawType && optionsStr && answerText) {
      rawType = 'mcq';
    }

    if (!lessonTitle || !rawType) {
      skippedCount++;
      issuesFound.push(`Row ${rowNum}: Missing 'lesson' or 'type'`);
      continue;
    }

    let mappedType = rawType;
    if (mappedType === 'statement' || mappedType === 'concept') mappedType = 'concept';
    else if (mappedType === 're-arrange' || mappedType === 'rearrange') mappedType = 'rearrange';
    else if (mappedType === 'fill-in-the-blank' || mappedType === 'fib') mappedType = 'fib';
    else if (mappedType.includes('mcq')) mappedType = 'mcq';

    let isValid = true;
    if (['comic', 'concept', 'video'].includes(mappedType)) {
      if (!conceptText && !questionText && images.length === 0) {
        isValid = false;
        issuesFound.push(`Row ${rowNum} (${mappedType}): Missing concept text, question, or image`);
      }
    } else if (mappedType === 'mcq') {
      if (!questionText || !optionsStr || !answerText) {
        isValid = false;
        issuesFound.push(`Row ${rowNum} (${mappedType}): Missing question, options, or answer`);
      }
    } else if (mappedType === 'rearrange') {
      if (!optionsStr || !answerText) {
        isValid = false;
        issuesFound.push(`Row ${rowNum} (${mappedType}): Missing words/options or answer`);
      }
    } else if (mappedType === 'fib') {
      if (!questionText && !conceptText) {
        isValid = false;
        issuesFound.push(`Row ${rowNum} (${mappedType}): Missing question/concept`);
      }
      if (!answerText) {
        isValid = false;
        issuesFound.push(`Row ${rowNum} (${mappedType}): Missing answer`);
      }
    } else if (mappedType === 'descriptive') {
      if (!questionText || (!conceptText && !answerText)) {
        isValid = false;
        issuesFound.push(`Row ${rowNum} (${mappedType}): Missing question or model answer/keywords`);
      }
    }

    if (!isValid) {
      skippedCount++;
      continue;
    }

    // Manage Units
    if (unitTitleRaw !== currentUnitTitle) {
      currentUnitTitle = unitTitleRaw;
      if (!unitOrderMap[currentUnitTitle]) {
        unitOrderMap[currentUnitTitle] = unitOrderCounter++;
      }
    }

    let unit = null;
    let unitIdStr = currentUnitTitle;
    if (!isDryRun) {
      unit = await Unit.findOne({ chapterId: targetChapter._id, title: currentUnitTitle });
      if (!unit) {
        unit = await Unit.create({
          chapterId: targetChapter._id,
          title: currentUnitTitle,
          order: unitOrderMap[currentUnitTitle]
        });
      } else {
        unit.order = unitOrderMap[currentUnitTitle];
        await unit.save();
      }
      unitIdStr = String(unit._id);
      validUnitIds.add(unitIdStr);
    }

    if (!unitModuleOrderCounters[unitIdStr]) unitModuleOrderCounters[unitIdStr] = 1;

    // Manage Modules (Lessons)
    let mod = null;
    let modIdStr = `${unitIdStr}_${lessonTitle}`;

    if (lessonTitle !== currentLessonTitle || (isDryRun && !currentModuleId)) {
      currentLessonTitle = lessonTitle;
      const finalModuleTitle = lessonTitle;

      if (!isDryRun) {
        mod = await Module.findOne({ chapterId: targetChapter._id, unitId: unit._id, title: finalModuleTitle });
        if (!mod) {
          mod = await Module.create({
            chapterId: targetChapter._id,
            unitId: unit._id,
            title: finalModuleTitle,
            order: unitModuleOrderCounters[unitIdStr]++
          });
        } else {
          mod.order = unitModuleOrderCounters[unitIdStr]++;
          await mod.save();
        }
        currentModuleId = mod._id;
        modIdStr = String(mod._id);
        validModuleIds.add(modIdStr);
      } else {
        currentModuleId = modIdStr;
      }
    } else if (!isDryRun) {
      mod = await Module.findById(currentModuleId);
      modIdStr = String(mod._id);
    }

    // Track unit summary
    if (!unitSummary[currentUnitTitle]) unitSummary[currentUnitTitle] = {};
    if (!unitSummary[currentUnitTitle][lessonTitle]) unitSummary[currentUnitTitle][lessonTitle] = 0;
    unitSummary[currentUnitTitle][lessonTitle]++;

    // Clear module items on first occurrence in this run
    if (!isDryRun && !clearedModules.has(modIdStr)) {
      await CurriculumItem.deleteMany({ moduleId: mod._id });
      await DefaultRevisionQuestion.deleteMany({ moduleId: mod._id });
      clearedModules.add(modIdStr);
    }

    if (!orderCounters[modIdStr]) orderCounters[modIdStr] = 1;
    const currentOrder = orderCounters[modIdStr]++;

    // Prepare CurriculumItem document
    const itemDoc = {
      order: currentOrder,
      type: mappedType
    };

    if (!isDryRun) {
      itemDoc.moduleId = mod._id;
    }

    if (mappedType === 'descriptive') {
      itemDoc.question = questionText;
      if (conceptText) itemDoc.modelAnswers = [conceptText];
      if (answerText) itemDoc.keywords = answerText.split(',').map(s => s.trim()).filter(Boolean);
    } else if (mappedType === 'mcq') {
      itemDoc.type = 'multiple-choice';
      itemDoc.question = questionText || conceptText;
      
      let parsedOpts = parseOptions(optionsStr, answerText);
      const match = answerText ? parsedOpts.find(o => o.toLowerCase() === answerText.trim().toLowerCase()) : null;
      if (match) {
        itemDoc.answer = match;
      } else {
        // Check fuzzy match
        const fuzzy = parsedOpts.find(o => 
          answerText.toLowerCase().includes(o.toLowerCase()) || o.toLowerCase().includes(answerText.toLowerCase())
        );
        if (fuzzy) {
          itemDoc.answer = fuzzy;
        } else {
          itemDoc.answer = answerText;
          if (!parsedOpts.includes(answerText)) {
            parsedOpts.push(answerText);
          }
        }
      }
      itemDoc.options = parsedOpts;
    } else if (mappedType === 'fib') {
      itemDoc.type = 'fill-in-the-blank';
      itemDoc.question = questionText || conceptText;
      itemDoc.answer = answerText;
    } else if (mappedType === 'rearrange') {
      itemDoc.type = 'rearrange';
      itemDoc.question = questionText || 'Rearrange the words to form the correct sentence.';
      itemDoc.answer = answerText;
      itemDoc.options = optionsStr.split(',').map(s => s.trim()).filter(Boolean);
      itemDoc.words = itemDoc.options;
    } else if (['concept', 'comic', 'video'].includes(mappedType)) {
      itemDoc.text = conceptText || questionText;
      if (mappedType === 'video') itemDoc.question = questionText;
    }

    if (images.length > 0) {
      if (mappedType === 'video') {
        itemDoc.videoUrl = images[0];
        if (images.length > 1) itemDoc.images = images.slice(1);
      } else {
        itemDoc.images = images;
        if (itemDoc.type === 'comic') {
          itemDoc.imageUrl = images[0];
        }
      }
    }

    if (!isDryRun) {
      await CurriculumItem.create(itemDoc);

      if (reviseVal === 'y' || reviseVal === 'yes') {
        await DefaultRevisionQuestion.create({
          boardId: boardId,
          classId: classId,
          subjectId: subjectId,
          chapterId: targetChapter._id,
          unitId: unit._id,
          moduleId: mod._id,
          lessonIndex: currentOrder,
          type: itemDoc.type,
          question: itemDoc.question,
          text: itemDoc.text,
          options: itemDoc.options,
          answer: itemDoc.answer,
          words: itemDoc.words,
          images: itemDoc.images,
          videoUrl: itemDoc.videoUrl,
          order: currentOrder
        });
      }
    }

    processedCount++;
  }

  // Cleanup stale modules & units (only in live mode)
  if (!isDryRun) {
    const existingModules = await Module.find({ chapterId: targetChapter._id });
    for (const m of existingModules) {
      if (!validModuleIds.has(String(m._id))) {
        await CurriculumItem.deleteMany({ moduleId: m._id });
        await DefaultRevisionQuestion.deleteMany({ moduleId: m._id });
        await Module.deleteOne({ _id: m._id });
      }
    }

    const existingUnits = await Unit.find({ chapterId: targetChapter._id });
    for (const u of existingUnits) {
      if (!validUnitIds.has(String(u._id))) {
        await Unit.deleteOne({ _id: u._id });
      }
    }
  }

  console.log(`\n========================================`);
  console.log(`📋 Curriculum Structure Summary:`);
  Object.entries(unitSummary).forEach(([unitName, moduleMap]) => {
    console.log(`\n📁 [${unitName}] (${Object.keys(moduleMap).length} modules):`);
    Object.entries(moduleMap).forEach(([modName, count], idx) => {
      console.log(`   ${idx + 1}. ${modName} -> ${count} items`);
    });
  });

  console.log(`\n========================================`);
  if (isDryRun) {
    console.log(`🧪 DRY-RUN COMPLETED!`);
    console.log(`✅ Validated ${processedCount} curriculum items.`);
  } else {
    console.log(`🎉 UPLOAD COMPLETED!`);
    console.log(`✅ Successfully uploaded ${processedCount} curriculum items to MongoDB.`);
  }

  if (skippedCount > 0) {
    console.log(`⚠️ Skipped ${skippedCount} rows with issues.`);
    issuesFound.forEach(iss => console.log(`   - ${iss}`));
  }
  console.log(`========================================\n`);

  if (!isDryRun) {
    await mongoose.disconnect();
  }
  process.exit(0);
}

run().catch(err => {
  console.error("❌ Fatal error:", err);
  process.exit(1);
});
