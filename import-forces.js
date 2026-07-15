import fs from 'fs';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Board from './models/Board.js';
import ClassLevel from './models/ClassLevel.js';
import Subject from './models/Subject.js';
import Chapter from './models/Chapter.js';
import Unit from './models/Unit.js';
import Module from './models/Module.js';
import CurriculumItem from './models/CurriculumItem.js';
import DefaultRevisionQuestion from './models/DefaultRevisionQuestion.js';
import Papa from 'papaparse';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
const CSV_FILE = 'D:\\Forces - Akshit Upload 9th July.csv';

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log("✅ Connected to MongoDB.");

  if (!fs.existsSync(CSV_FILE)) {
      console.log(`❌ Could not find the CSV file at ${CSV_FILE}`);
      process.exit(1);
  }

  console.log(`\n⏳ Processing ${CSV_FILE}...`);
  const content = fs.readFileSync(CSV_FILE, 'utf-8');
  
  const parsed = Papa.parse(content, {
      header: true,
      skipEmptyLines: true,
      transformHeader: function(h) { return h.trim().toLowerCase(); }
  });

  const rows = parsed.data;
  console.log(`Found ${rows.length} rows.`);

  const chapterTitle = 'Chapter 5: Exploring Forces';
  let targetChapter = await Chapter.findOne({ title: chapterTitle });
  let boardId, classId, subjectId;

  if (!targetChapter) {
      console.log(`⚠️ Could not find an existing '${chapterTitle}' chapter. Creating it...`);
      let board = await Board.findOne({ name: /CBSE/i }); 
      if (!board) board = await Board.create({ name: 'CBSE' });
      
      let cls = await ClassLevel.findOne({ boardId: board._id, name: '8' });
      if (!cls) cls = await ClassLevel.create({ boardId: board._id, name: '8' });

      let subject = await Subject.findOne({ boardId: board._id, classId: cls._id, name: /Science/i });
      if (!subject) subject = await Subject.create({ boardId: board._id, classId: cls._id, name: 'Science', order: 1 });
      
      boardId = board._id;
      classId = cls._id;
      subjectId = subject._id;

      targetChapter = await Chapter.create({ subjectId: subject._id, title: chapterTitle, order: 5, isPublished: false });
  } else {
      console.log(`✅ Found Target Chapter: ${targetChapter.title}`);
      
      // Enforce admins only mode
      targetChapter.isPublished = false;
      await targetChapter.save();
      console.log(`🔒 Chapter set to unpublished (Admins Only).`);

      subjectId = targetChapter.subjectId;
      const sub = await Subject.findById(subjectId);
      if (sub) {
          boardId = sub.boardId;
          classId = sub.classId;
      }
  }

  const validUnitIds = new Set();
  const validModuleIds = new Set();
  
  const clearedModules = new Set();
  const orderCounters = {};
  const unitModuleOrderCounters = {};

  let processedCount = 0;
  let skippedCount = 0;
  let issuesFound = [];

  // Pre-scan for difficult module blocks
  let difficultBlocks = 0;
  let lastLesson = null;
  for (const row of rows) {
    const lt = String(row['lesson name'] || row['lesson title'] || row['lesson_title'] || row['lesson'] || '').trim();
    if (lt && lt !== lastLesson) {
      if (/difficult module/i.test(lt) || /hot module/i.test(lt)) difficultBlocks++;
      lastLesson = lt;
    }
  }
  console.log(`Found ${difficultBlocks} 'Difficult Module' blocks.`);

  let currentLessonTitle = null;
  let currentModuleId = null;
  const titleCounts = {};

  for (let i = 0; i < rows.length; i++) {
     const row = rows[i];
     const rowNum = i + 2; 
     
     const typeStr = (row['type'] || '').trim().toLowerCase();
     
     // Handle new concept/statement header
     const conceptText = (row['concept/statement'] || row['concept'] || row['statement'] || '').trim();
     
     const questionText = (row['questions'] || row['question'] || '').trim();
     const optionsStr = (row['options'] || '').trim();
     const answerText = (row['answers'] || row['answer'] || '').trim();
     const lessonTitle = (row['lesson name'] || row['lesson title'] || row['lesson_title'] || row['lesson'] || '').trim();
     const unitTitleRaw = (row['unit name'] || row['unit title'] || row['unit_title'] || row['unit'] || 'Default Unit').trim();
     const reviseVal = (row['revise?'] || row['revise'] || '').trim().toLowerCase();

     if (!typeStr && !conceptText && !questionText && !lessonTitle) {
       continue;
     }

     if (!lessonTitle || !typeStr) {
       skippedCount++;
       issuesFound.push(`Row ${rowNum}: Missing 'lesson_title' or 'type'`);
       continue;
     }

     let isValid = true;
     let mappedType = typeStr;

     if (mappedType === 'statement' || mappedType === 'concept') mappedType = 'concept';
     else if (mappedType === 're-arrange' || mappedType === 'rearrange') mappedType = 're-arrange';
     else if (mappedType === 'fill-in-the-blank' || mappedType === 'fib') mappedType = 'fib';
     else if (mappedType.includes('mcq')) mappedType = 'mcq';

     const img1 = (row['image 1'] || row['images 1 '] || row['images 1'] || '').trim();
     
     if (['comic', 'concept', 'video'].includes(mappedType)) {
       if (!conceptText && !questionText && !img1) {
          isValid = false;
          issuesFound.push(`Row ${rowNum} (${mappedType}): Missing concept text, question text, or image`);
       }
     } else if (mappedType === 'mcq') {
       if (!questionText || !optionsStr || !answerText) {
          isValid = false;
          issuesFound.push(`Row ${rowNum} (${mappedType}): Missing question, options, or answers`);
       }
     } else if (mappedType === 're-arrange') {
       if (!questionText || !optionsStr || !answerText) {
          isValid = false;
          issuesFound.push(`Row ${rowNum} (${mappedType}): Missing question, options, or answers`);
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
       if (!questionText || !conceptText || !answerText) {
          isValid = false;
          issuesFound.push(`Row ${rowNum} (${mappedType}): Missing question, model answer, or keywords`);
       }
     }

     if (!isValid) {
        skippedCount++;
        continue;
     }

     let unit = await Unit.findOne({ chapterId: targetChapter._id, title: unitTitleRaw });
     if (!unit) unit = await Unit.create({ chapterId: targetChapter._id, title: unitTitleRaw, order: 1 });

     const unitIdStr = String(unit._id);
     validUnitIds.add(unitIdStr);
     
     if (!unitModuleOrderCounters[unitIdStr]) unitModuleOrderCounters[unitIdStr] = 1;

     let mod;
     if (lessonTitle !== currentLessonTitle) {
         currentLessonTitle = lessonTitle;
         let finalTitle = lessonTitle;
         
         if (!titleCounts[lessonTitle]) {
             titleCounts[lessonTitle] = 1;
             if ((/difficult module/i.test(lessonTitle) || /hot module/i.test(lessonTitle)) && difficultBlocks > 1) {
                 finalTitle = `${lessonTitle} 1`;
             }
         } else {
             titleCounts[lessonTitle]++;
             finalTitle = `${lessonTitle} ${titleCounts[lessonTitle]}`;
         }

         mod = await Module.findOne({ chapterId: targetChapter._id, unitId: unit._id, title: finalTitle });
         if (!mod) {
             mod = await Module.create({ chapterId: targetChapter._id, unitId: unit._id, title: finalTitle, order: unitModuleOrderCounters[unitIdStr]++ });
         } else {
             mod.order = unitModuleOrderCounters[unitIdStr]++;
             await mod.save();
         }
         currentModuleId = mod._id;
     } else {
         mod = await Module.findById(currentModuleId);
     }

     const modIdStr = String(mod._id);
     validModuleIds.add(modIdStr);
     
     if (!clearedModules.has(modIdStr)) {
        await CurriculumItem.deleteMany({ moduleId: mod._id });
        await DefaultRevisionQuestion.deleteMany({ moduleId: mod._id });
        clearedModules.add(modIdStr);
     }

     if (!orderCounters[modIdStr]) orderCounters[modIdStr] = 1;
     const currentOrder = orderCounters[modIdStr]++;

     let itemDoc = {
        moduleId: mod._id,
        order: currentOrder,
        type: mappedType
     };
     
     if (mappedType === 'descriptive') {
        itemDoc.question = questionText;
        if (conceptText) itemDoc.modelAnswers = [conceptText];
        if (answerText) itemDoc.keywords = answerText.split(',').map(s => s.trim()).filter(Boolean);
     } else if (['mcq', 're-arrange', 'fib'].includes(mappedType)) {
        if (mappedType === 'mcq') itemDoc.type = 'multiple-choice';
        if (mappedType === 'fib') itemDoc.type = 'fill-in-the-blank';
        if (mappedType === 're-arrange') itemDoc.type = 'rearrange';
        
        itemDoc.question = questionText || conceptText;
        itemDoc.answer = answerText;
        
        if (optionsStr) {
           if (itemDoc.type === 'multiple-choice') {
               let opts = optionsStr.split(',').map(s => s.trim()).filter(Boolean);
               
               if (itemDoc.answer && itemDoc.answer.includes(',') && optionsStr.includes(';')) {
                   itemDoc.answer = itemDoc.answer.replace(/,/g, ';');
               }

               if (opts.length === 6 || opts.length === 9) {
                   const chunkSize = opts.length / 3;
                   const newOpts = [];
                   for (let j = 0; j < opts.length; j += chunkSize) {
                       newOpts.push(opts.slice(j, j + chunkSize).join(', '));
                   }
                   opts = newOpts;
               }
               
               const matchingOpt = itemDoc.answer ? opts.find(o => o.toLowerCase() === itemDoc.answer.toLowerCase()) : null;
               if (!matchingOpt && itemDoc.answer) {
                   const fuzzyMatch = opts.find(o => o.replace(/;/g, ',').toLowerCase() === itemDoc.answer.replace(/;/g, ',').toLowerCase());
                   if (fuzzyMatch) itemDoc.answer = fuzzyMatch;
                   else if (opts.length > 0 && !opts.includes(itemDoc.answer)) opts[0] = itemDoc.answer;
               } else if (matchingOpt) {
                   itemDoc.answer = matchingOpt;
               }
               
               itemDoc.options = opts;
           } else {
               itemDoc.options = optionsStr.split(',').map(s => s.trim()).filter(Boolean);
               if (itemDoc.type === 'rearrange') itemDoc.words = itemDoc.options;
           }
        }
     } else if (['concept', 'comic', 'video'].includes(mappedType)) {
        itemDoc.text = conceptText || questionText;
        if (mappedType === 'video') itemDoc.question = questionText;
     }
     
     const images = [];
     const imgHeaders = ['image 1', 'image 2', 'image 3', 'images 1 ', 'images 2 ', 'images 3 '];
     const matchedHeaders = [];
     
     // Deduplicate and extract images
     imgHeaders.forEach(k => {
        if (row[k] && row[k].trim().startsWith('http') && !matchedHeaders.includes(row[k].trim())) {
           images.push(row[k].trim());
           matchedHeaders.push(row[k].trim());
        }
     });
     
     if (images.length > 0) {
        if (mappedType === 'video') {
           itemDoc.videoUrl = images[0];
           if (images.length > 1) {
              itemDoc.images = images.slice(1);
           }
        } else {
           itemDoc.images = images;
           if (itemDoc.type === 'comic') {
              itemDoc.imageUrl = images[0];
           }
        }
     }
     
     await CurriculumItem.create(itemDoc);
     processedCount++;

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

  // Cleanup stale modules and units for the whole chapter
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

  console.log(`\n🎉 Upload completed! Successfully processed ${processedCount} rows.`);
  if (skippedCount > 0) {
     console.log(`🚫 Skipped ${skippedCount} rows that were missing required text, options, or answers.`);
     console.log(`\n--- Issue Report ---`);
     issuesFound.forEach(issue => console.log(issue));
  }
  
  process.exit(0);
}

run().catch(err => {
    console.error(err);
    process.exit(1);
});
