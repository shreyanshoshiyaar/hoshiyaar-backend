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
                // End of row
                currentRow.push(curVal.trim());
                if (currentRow.some(c => c.length > 0)) {
                    rows.push(currentRow);
                }
                currentRow = [];
                curVal = '';
                // Handle \r\n
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
    'D:\\Mindful eating - A path to a healthy body - CBSE.csv'
  ];

  const existingFiles = files.filter(f => fs.existsSync(f));
  if (existingFiles.length === 0) {
      console.log("❌ Could not find the CSV file on D drive! Please check the exact name.");
      process.exit(1);
  }

  console.log(`\n📦 Found ${existingFiles.length} CSV files to import:\n` + existingFiles.join('\n') + '\n');

  let targetChapter = await Chapter.findOne({ title: /Mindful eating/i });
  
  if (!targetChapter) {
      console.log("⚠️ Could not find an existing 'Mindful eating' chapter. Creating it in CBSE -> Class 6 -> Science.");
      let board = await Board.findOne({ name: 'CBSE' }); 
      const cls = await ClassLevel.findOne({ boardId: board._id, name: '6' });
      const subject = await Subject.findOne({ boardId: board._id, classId: cls._id, name: 'Science' });
      targetChapter = await Chapter.create({ subjectId: subject._id, title: 'Chapter 3: Mindful eating - A Path to a Healthy Body', order: 3 });
  } else {
      console.log(`✅ Found Target Chapter: ${targetChapter.title}`);
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
  console.log("🧹 Cleared old Mindful Eating modules for a fresh ordered upload.");

  for (const filePath of existingFiles) {
    console.log(`\n⏳ Processing ${filePath}...`);
    const content = fs.readFileSync(filePath, 'utf-8');
    
    const rows = parseFullCsv(content);
    if (rows.length < 2) continue;
    
    const headers = rows[0].map(h => h.trim().toLowerCase());
    
    // Custom mapping for this specific weird CSV structure
    const lessonTitleIndices = [];
    headers.forEach((h, i) => { if (h.includes('lesson title')) lessonTitleIndices.push(i); });
    
    const idxUnit = headers.findIndex(h => h.includes('unit title'));
    const idxLesson = lessonTitleIndices[0] ?? -1; 
    const idxType = lessonTitleIndices[1] ?? -1; // Type is the second 'Lesson Title' column
    const idxConcept = headers.findIndex(h => h === 'concept' || h.includes('concept'));
    const idxQuestion = headers.findIndex(h => h === 'questions' || h.includes('question'));
    const idxOptions = headers.findIndex(h => h === 'options');
    const idxAnswer = headers.findIndex(h => h === 'answer');
    
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

  console.log("\n🎉 All CSVs successfully uploaded directly to the 'Mindful eating' chapter in CBSE!");
  process.exit(0);
}

run().catch(err => {
  console.error("❌ Error uploading data:", err);
  process.exit(1);
});
