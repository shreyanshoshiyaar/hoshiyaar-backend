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

dotenv.config();

function parseCsvLine(text) {
    let result = [];
    let curVal = '';
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
        let char = text[i];
        if (inQuotes) {
            if (char === '"') {
                if (i + 1 < text.length && text[i + 1] === '"') {
                    curVal += '"';
                    i++;
                } else {
                    inQuotes = false;
                }
            } else {
                curVal += char;
            }
        } else {
            if (char === '"') {
                inQuotes = true;
            } else if (char === ',') {
                result.push(curVal.trim());
                curVal = '';
            } else {
                curVal += char;
            }
        }
    }
    result.push(curVal.trim());
    return result;
}

const MONGO_URI = process.env.MONGO_URI;

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log("✅ Connected to MongoDB.");

  const files = [
    'D:\\Temperature - Unit 1 v2.xlsx - Unit 1_ Temperature & thermometer.csv',
    'D:\\Temperature - Unit 1 v2.xlsx - Unit 2_ Scales of temperature.csv',
    'D:\\Temperature - Unit 1 v2.xlsx - Unit 3_ Types of Thermometer.csv'
  ];

  // Specific cleanup to reset order for the newly uploaded CSVs without touching other chapters
  // The chapter created by seedDatabase was 'Temperature And Thermometer'
  const chapterToClear = await Chapter.findOne({ title: 'Temperature And Thermometer' });
  if (chapterToClear) {
      const unitsToClear = await Unit.find({ chapterId: chapterToClear._id });
      for (const u of unitsToClear) {
          const modsToClear = await Module.find({ unitId: u._id });
          for (const m of modsToClear) {
              await CurriculumItem.deleteMany({ moduleId: m._id });
          }
          await Module.deleteMany({ unitId: u._id });
      }
      console.log("🧹 Cleared old Temperature modules for a fresh ordered upload.");
  }

  for (const filePath of files) {
    if (!fs.existsSync(filePath)) {
       console.log(`❌ File not found: ${filePath}`);
       continue;
    }
    console.log(`\n⏳ Processing ${filePath}...`);
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length === 0) continue;
    
    const headers = parseCsvLine(lines[0]).map(h => h.trim().toLowerCase());
    
    const idxBoard = headers.findIndex(h => h === 'board_title');
    const idxClass = headers.findIndex(h => h === 'class_title');
    const idxSubject = headers.findIndex(h => h === 'subject');
    const idxChapter = headers.findIndex(h => h === 'chapter_title');
    const idxUnit = headers.findIndex(h => h === 'unit_title');
    const idxLesson = headers.findIndex(h => h === 'lesson_title');
    const idxType = headers.findIndex(h => h === 'type');
    const idxConcept = headers.findIndex(h => h === 'concept/statement');
    const idxQuestion = headers.findIndex(h => h === 'question');
    const idxOptions = headers.findIndex(h => h === 'options');
    const idxAnswer = headers.findIndex(h => h === 'answer');
    
    const imgIndices = [];
    headers.forEach((h, i) => {
       if (h.includes('image')) imgIndices.push(i);
    });

    const clearedModules = new Set();
    const orderCounters = {};
    const unitModuleOrderCounters = {};

    for (let i = 1; i < lines.length; i++) {
       const row = parseCsvLine(lines[i]);
       if (!row[idxLesson] || !row[idxType]) continue;

       const boardTitle = row[idxBoard] || 'CBSE';
       const classTitle = row[idxClass] || '5';
       const subjectTitle = row[idxSubject] || 'Science';
       const chapterTitle = row[idxChapter] || 'Temperature And Thermometer'; // Fallback
       const unitTitle = row[idxUnit] || 'Default Unit';
       let moduleTitle = row[idxLesson];
       let typeStr = row[idxType].toLowerCase();

       // Handle Hot Module renaming
       if (moduleTitle.toLowerCase() === 'difficult module') {
          moduleTitle = 'HOT Module';
       }

       // 1. Resolve Board
       let board = await Board.findOne({ name: boardTitle });
       if (!board) board = await Board.create({ name: boardTitle, slug: boardTitle.toLowerCase() });

       // 2. Resolve ClassLevel
       let classLevel = await ClassLevel.findOne({ boardId: board._id, name: classTitle });
       if (!classLevel) classLevel = await ClassLevel.create({ boardId: board._id, name: classTitle, order: parseInt(classTitle) || 1 });

       // 3. Resolve Subject
       let subject = await Subject.findOne({ boardId: board._id, classId: classLevel._id, name: subjectTitle });
       if (!subject) subject = await Subject.create({ boardId: board._id, classId: classLevel._id, name: subjectTitle, icon: 'book' });

       // 4. Resolve Chapter
       let chapter = await Chapter.findOne({ subjectId: subject._id, title: chapterTitle });
       if (!chapter) chapter = await Chapter.create({ subjectId: subject._id, title: chapterTitle, order: 1 });

       // 5. Resolve Unit
       let unit = await Unit.findOne({ chapterId: chapter._id, title: unitTitle });
       if (!unit) unit = await Unit.create({ chapterId: chapter._id, title: unitTitle, order: 1 });

       // 6. Resolve Module with Order tracking
       const unitIdStr = String(unit._id);
       if (!unitModuleOrderCounters[unitIdStr]) {
          unitModuleOrderCounters[unitIdStr] = 1;
       }

       let mod = await Module.findOne({ chapterId: chapter._id, unitId: unit._id, title: moduleTitle });
       if (!mod) {
           mod = await Module.create({ chapterId: chapter._id, unitId: unit._id, title: moduleTitle, order: unitModuleOrderCounters[unitIdStr]++ });
       }

       const modIdStr = String(mod._id);
       if (!clearedModules.has(modIdStr)) {
          await CurriculumItem.deleteMany({ moduleId: mod._id });
          clearedModules.add(modIdStr);
       }

       if (!orderCounters[modIdStr]) orderCounters[modIdStr] = 1;
       const currentOrder = orderCounters[modIdStr]++;

       let itemDoc = {
          moduleId: mod._id,
          order: currentOrder,
          type: typeStr
       };
       
       const conceptText = row[idxConcept] ? row[idxConcept].replace(/^"|"$/g, '').trim() : '';
       const questionText = row[idxQuestion] ? row[idxQuestion].replace(/^"|"$/g, '').trim() : '';
       const optionsStr = row[idxOptions] ? row[idxOptions].replace(/^"|"$/g, '').trim() : '';
       const answerText = row[idxAnswer] ? row[idxAnswer].replace(/^"|"$/g, '').trim() : '';
       
       if (typeStr === 'descriptive') {
          itemDoc.question = questionText;
          if (conceptText) {
             itemDoc.modelAnswers = [conceptText];
          }
          if (answerText) {
             itemDoc.keywords = answerText.split(',').map(s => s.trim()).filter(Boolean);
          }
       } else if (['mcq', 're-arrange', 'fib'].includes(typeStr)) {
          if (typeStr === 'mcq') itemDoc.type = 'multiple-choice';
          if (typeStr === 'fib') itemDoc.type = 'fill-in-the-blank';
          if (typeStr === 're-arrange') itemDoc.type = 'rearrange';
          
          itemDoc.question = questionText || conceptText;
          itemDoc.answer = answerText;
          
          if (optionsStr) {
             if (itemDoc.type === 'multiple-choice') {
                 let opts = [];
                 if (optionsStr.includes(', ')) {
                     opts = optionsStr.split(',').map(s => s.trim()).filter(Boolean);
                 } else {
                     opts = optionsStr.split(',').map(s => s.trim()).filter(Boolean);
                 }
                 
                 if (itemDoc.answer.includes(',') && optionsStr.includes(';')) {
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
                 
                 const matchingOpt = opts.find(o => o.toLowerCase() === itemDoc.answer.toLowerCase());
                 if (!matchingOpt) {
                     const fuzzyMatch = opts.find(o => o.replace(/;/g, ',').toLowerCase() === itemDoc.answer.replace(/;/g, ',').toLowerCase());
                     if (fuzzyMatch) {
                         itemDoc.answer = fuzzyMatch;
                     } else if (opts.length > 0 && itemDoc.answer) {
                         if (!opts.includes(itemDoc.answer)) {
                             opts[0] = itemDoc.answer;
                         }
                     }
                 } else {
                     itemDoc.answer = matchingOpt;
                 }
                 
                 itemDoc.options = opts;
             } else {
                 itemDoc.options = optionsStr.split(',').map(s => s.trim()).filter(Boolean);
                 if (itemDoc.type === 'rearrange') itemDoc.words = itemDoc.options;
             }
          }
       } else if (['concept', 'comic', 'video'].includes(typeStr)) {
          itemDoc.text = conceptText || questionText;
          if (typeStr === 'video') itemDoc.question = questionText;
       } else {
          continue; 
       }
       
       const images = [];
       imgIndices.forEach(idx => {
          if (row[idx] && row[idx].trim().startsWith('http')) {
             images.push(row[idx].trim());
          }
       });
       
       if (images.length > 0) {
          itemDoc.images = images;
          if (itemDoc.type === 'comic') {
             itemDoc.imageUrl = images[0];
          } else if (itemDoc.type === 'video') {
             itemDoc.videoUrl = images[0];
             itemDoc.imageUrl = images[0]; 
          }
       }
       
       await CurriculumItem.create(itemDoc);
    }
    console.log(`✅ Finished uploading ${filePath}`);
  }

  console.log("\n🎉 All CSVs successfully uploaded!");
  process.exit(0);
}

run().catch(err => {
  console.error("❌ Error uploading data:", err);
  process.exit(1);
});
