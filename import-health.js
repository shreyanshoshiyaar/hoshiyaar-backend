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

function parseFullCsv(text) {
    let rows = [];
    let currentRow = [];
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
                currentRow.push(curVal.trim());
                curVal = '';
            } else if (char === '\n' || char === '\r') {
                currentRow.push(curVal.trim());
                if (currentRow.some(c => c.length > 0)) {
                    rows.push(currentRow);
                }
                currentRow = [];
                curVal = '';
                if (char === '\r' && i + 1 < text.length && text[i + 1] === '\n') {
                    i++;
                }
            } else {
                curVal += char;
            }
        }
    }
    if (curVal.length > 0 || currentRow.length > 0) {
        currentRow.push(curVal.trim());
        if (currentRow.some(c => c.length > 0)) {
            rows.push(currentRow);
        }
    }
    return rows;
}

const MONGO_URI = process.env.MONGO_URI;

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log("✅ Connected to MongoDB.");

  const files = [
    'D:\\Health-The Ultimate Treasure - New Script Format.csv'
  ];

  const existingFiles = files.filter(f => fs.existsSync(f));
  if (existingFiles.length === 0) {
      console.log("❌ Could not find the CSV file on D drive! Please check the exact name.");
      process.exit(1);
  }

  console.log(`\n📦 Found ${existingFiles.length} CSV files to import:\n` + existingFiles.join('\n') + '\n');

  let board = await Board.findOne({ name: 'CBSE' }); 
  if (!board) board = await Board.create({ name: 'CBSE', description: 'CBSE Board' });
  
  let cls = await ClassLevel.findOne({ boardId: board._id, name: '8' });
  if (!cls) {
      console.log("⚠️ Class 8 not found. Creating it...");
      cls = await ClassLevel.create({ boardId: board._id, name: '8', description: 'Class 8' });
  }

  let subject = await Subject.findOne({ boardId: board._id, classId: cls._id, name: 'Science' });
  if (!subject) {
      console.log("⚠️ Science subject not found for Class 8. Creating it...");
      subject = await Subject.create({ boardId: board._id, classId: cls._id, name: 'Science', description: 'Science for Class 8' });
  }

  let targetChapter = await Chapter.findOne({ subjectId: subject._id, title: /Health.*Ultimate Treasure/i });
  if (!targetChapter) {
      console.log("⚠️ Could not find an existing chapter. Creating it...");
      targetChapter = await Chapter.create({ subjectId: subject._id, title: 'Chapter 3: Health - The Ultimate Treasure', order: 3 });
  } else {
      console.log(`✅ Found Target Chapter: ${targetChapter.title}. Ensuring it's named Chapter 3...`);
      targetChapter.title = 'Chapter 3: Health - The Ultimate Treasure';
      targetChapter.order = 3;
      await targetChapter.save();
  }

  const unitsToClear = await Unit.find({ chapterId: targetChapter._id });
  for (const u of unitsToClear) {
      const modsToClear = await Module.find({ unitId: u._id });
      for (const m of modsToClear) {
          await CurriculumItem.deleteMany({ moduleId: m._id });
      }
      await Module.deleteMany({ unitId: u._id });
  }
  await Unit.deleteMany({ chapterId: targetChapter._id });
  console.log("🧹 Cleared old modules for a fresh ordered upload.");

  for (const filePath of existingFiles) {
    console.log(`\n⏳ Processing ${filePath}...`);
    const content = fs.readFileSync(filePath, 'utf-8');
    
    const rows = parseFullCsv(content);
    if (rows.length < 2) continue;
    
    const headers = rows[0].map(h => h.trim().toLowerCase());
    
    const lessonTitleIndices = [];
    headers.forEach((h, i) => { if (h.includes('lesson')) lessonTitleIndices.push(i); });
    
    const idxUnit = headers.findIndex(h => h.includes('unit'));
    const idxLesson = lessonTitleIndices[0] ?? -1;
    let idxType = headers.findIndex(h => h.includes('type'));
    if (idxType === -1 && lessonTitleIndices.length > 1) {
       idxType = lessonTitleIndices[1];
    }
    
    const idxConcept = headers.findIndex(h => h.includes('concept') || h === 'statement');
    const idxQuestion = headers.findIndex(h => h.includes('question'));
    const idxOptions = headers.findIndex(h => h.includes('options'));
    const idxAnswer = headers.findIndex(h => h.includes('answer'));
    
    const imgIndices = [];
    headers.forEach((h, i) => {
       if (h.includes('image')) imgIndices.push(i);
    });

    const clearedModules = new Set();
    const orderCounters = {};
    const unitModuleOrderCounters = {};

    let processedCount = 0;

    for (let i = 1; i < rows.length; i++) {
       const row = rows[i];
       
       if (idxLesson === -1 || idxType === -1 || !row[idxLesson] || !row[idxType]) continue;

       const unitTitle = row[idxUnit] || 'Default Unit';
       let moduleTitle = row[idxLesson];
       let typeStr = row[idxType].toLowerCase();

       if (typeStr === 'statement' || typeStr === 'concept') typeStr = 'concept';
       else if (typeStr === 're-arrange' || typeStr === 'rearrange') typeStr = 're-arrange';
       else if (typeStr === 'fill-in-the-blank' || typeStr === 'fib') typeStr = 'fib';
       else if (typeStr.includes('mcq')) typeStr = 'mcq';

       let unit = await Unit.findOne({ chapterId: targetChapter._id, title: unitTitle });
       if (!unit) unit = await Unit.create({ chapterId: targetChapter._id, title: unitTitle, order: 1 });

       const unitIdStr = String(unit._id);
       if (!unitModuleOrderCounters[unitIdStr]) {
          unitModuleOrderCounters[unitIdStr] = 1;
       }

       let mod = await Module.findOne({ chapterId: targetChapter._id, unitId: unit._id, title: moduleTitle });
       if (!mod) {
           mod = await Module.create({ chapterId: targetChapter._id, unitId: unit._id, title: moduleTitle, order: unitModuleOrderCounters[unitIdStr]++ });
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
       
       const conceptText = (idxConcept !== -1 && row[idxConcept]) ? row[idxConcept].trim() : '';
       const questionText = (idxQuestion !== -1 && row[idxQuestion]) ? row[idxQuestion].trim() : '';
       const optionsStr = (idxOptions !== -1 && row[idxOptions]) ? row[idxOptions].trim() : '';
       const answerText = (idxAnswer !== -1 && row[idxAnswer]) ? row[idxAnswer].trim() : '';
       
       if (typeStr === 'descriptive') {
          itemDoc.question = questionText;
          if (conceptText) itemDoc.modelAnswers = [conceptText];
          if (answerText) itemDoc.keywords = answerText.split(',').map(s => s.trim()).filter(Boolean);
       } else if (['mcq', 're-arrange', 'fib'].includes(typeStr)) {
          if (typeStr === 'mcq') itemDoc.type = 'multiple-choice';
          if (typeStr === 'fib') itemDoc.type = 'fill-in-the-blank';
          if (typeStr === 're-arrange') itemDoc.type = 'rearrange';
          
          itemDoc.question = questionText || conceptText;
          itemDoc.answer = answerText;
          
          if (optionsStr) {
             if (itemDoc.type === 'multiple-choice') {
                 let opts = [];
                 if (optionsStr.includes(',')) {
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
                     if (fuzzyMatch) itemDoc.answer = fuzzyMatch;
                     else if (opts.length > 0 && itemDoc.answer && !opts.includes(itemDoc.answer)) opts[0] = itemDoc.answer;
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
       processedCount++;
    }
    console.log(`✅ Finished uploading ${filePath} (Created ${processedCount} items)`);
  }

  console.log("\n🎉 Upload successfully completed to 'Health - The Ultimate Treasure' in Class 8 CBSE Science!");
  process.exit(0);
}

run().catch(err => {
  console.error("❌ Error uploading data:", err);
  process.exit(1);
});
