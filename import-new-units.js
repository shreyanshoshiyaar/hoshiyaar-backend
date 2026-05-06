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

/**
 * Robust CSV multi-line string parser with state-tracking for inQuotes
 * Prevents shifting columns on internal commas or newlines.
 */
function parseCSV(content) {
  const rows = [];
  let currentRow = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const nextChar = content[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          currentField += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        currentRow.push(currentField.trim());
        currentField = '';
      } else if (char === '\r' || char === '\n') {
        currentRow.push(currentField.trim());
        if (currentRow.length > 1 || (currentRow.length === 1 && currentRow[0] !== '')) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentField = '';
        if (char === '\r' && nextChar === '\n') i++;
      } else {
        currentField += char;
      }
    }
  }
  if (currentRow.length > 0 || currentField !== '') {
    currentRow.push(currentField.trim());
    if (currentRow.length > 1 || (currentRow.length === 1 && currentRow[0] !== '')) {
      rows.push(currentRow);
    }
  }
  return rows;
}

/**
 * Native randomize/shuffling for rearrange words
 */
function shuffleArray(arr) {
  const newArr = [...arr];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
}

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Clean up previous bogus data created from the incorrect header columns
    await Board.deleteMany({ name: 'Unit 1: Key nutirients' });
    await ClassLevel.deleteMany({ name: 'Chapter 3: Mindful eating - A Path to a Healthy Body' });
    console.log('Cleaned up previous bogus board/class from database.');

    // Unique Index Fix
    try {
      await Module.collection.dropIndex('chapterId_1_title_1');
      console.log('Successfully dropped index chapterId_1_title_1 from modules collection.');
    } catch (err) {
      console.log('Index chapterId_1_title_1 not found or already dropped:', err.message);
    }

    // Resolve Canonical CBSE Science hierarchy
    let board = await Board.findOne({ name: 'CBSE' });
    if (!board) {
      board = await Board.findOne({ name: { $regex: /^cbse$/i } });
    }
    if (!board) {
      board = await Board.create({ name: 'CBSE' });
      console.log('Created Board: CBSE');
    }

    let classLevel = await ClassLevel.findOne({ name: '6', boardId: board._id });
    if (!classLevel) {
      classLevel = await ClassLevel.create({ name: '6', boardId: board._id });
      console.log('Created ClassLevel: 6');
    }

    let subject = await Subject.findOne({ name: 'Science', boardId: board._id, classId: classLevel._id });
    if (!subject) {
      subject = await Subject.create({ name: 'Science', boardId: board._id, classId: classLevel._id });
      console.log('Created Subject: Science');
    }

    const files = [
      'D:/Key_Nutrients.csv',
      'D:/Key_Nutrients_Nidhi.csv'
    ];

    const deletedUnits = new Set();

    for (const file of files) {
      if (!fs.existsSync(file)) {
        console.warn(`File not found: ${file}. Skipping.`);
        continue;
      }

      console.log(`Processing file: ${file}...`);
      const content = fs.readFileSync(file, 'utf-8');
      const rows = parseCSV(content);

      const headers = rows[0].map(h => h.toLowerCase().trim());
      console.log('CSV Headers:', headers);

      const chapterIdx = headers.indexOf('chapter title');
      const unitIdx = headers.indexOf('unit title');
      const moduleIdx = headers.indexOf('lesson title');
      
      let typeIdx = headers.indexOf('type');
      if (typeIdx === -1) {
        // If not explicit in header (like 'Lesson Title' again), col 3 holds the Type string
        typeIdx = 3;
      }
      
      const conceptIdx = headers.indexOf('concept');
      const questionIdx = headers.includes('questions') ? headers.indexOf('questions') : headers.indexOf('question');
      const optionsIdx = headers.indexOf('options');
      const answerIdx = headers.indexOf('answer');

      const dataRows = rows.slice(1);
      console.log(`Found ${dataRows.length} data rows in ${file}`);

      let currentModule = null;
      let currentModuleOrder = 0;
      let orderInModule = 1;

      for (const row of dataRows) {
        if (row.length < 4) continue;

        const chapterTitle = row[chapterIdx];
        const unitTitle = row[unitIdx];
        const moduleTitle = row[moduleIdx];
        const type = row[typeIdx];
        const conceptText = row[conceptIdx];
        const question = row[questionIdx];
        const optionsStr = row[optionsIdx];
        const answerText = row[answerIdx];

        // Extract image columns
        const imageCols = headers.map((h, i) => h.startsWith('image') ? i : -1).filter(i => i !== -1);
        const images = imageCols.map(idx => row[idx]).map(i => i ? i.trim() : '').filter(Boolean);

        if (!chapterTitle || !unitTitle || !moduleTitle || !type) {
          continue;
        }

        // 4. Chapter
        let chapter = await Chapter.findOne({ title: chapterTitle, subjectId: subject._id });
        if (!chapter) {
          chapter = await Chapter.create({ title: chapterTitle, subjectId: subject._id, order: 1 });
          console.log(`Created Chapter: ${chapterTitle}`);
        }

        // 5. Clean Slate Deletion & Unit Resolution
        const unitKey = `${chapter._id}_${unitTitle}`;
        if (!deletedUnits.has(unitKey)) {
          let existingUnit = await Unit.findOne({ title: unitTitle, chapterId: chapter._id });
          if (existingUnit) {
            const modulesInUnit = await Module.find({ unitId: existingUnit._id });
            for (const m of modulesInUnit) {
              await CurriculumItem.deleteMany({ moduleId: m._id });
            }
            await Module.deleteMany({ unitId: existingUnit._id });
            await Unit.deleteOne({ _id: existingUnit._id });
            console.log(`Clean slate: deleted existing unit '${unitTitle}', child modules, and child curriculum items.`);
          }
          deletedUnits.add(unitKey);
        }

        let unit = await Unit.findOne({ title: unitTitle, chapterId: chapter._id });
        if (!unit) {
          unit = await Unit.create({ title: unitTitle, chapterId: chapter._id, order: 1 });
          console.log(`Created Unit: ${unitTitle}`);
        }

        // 6. Module Ordering & Exact Sequential Counters
        if (!currentModule || currentModule.title !== moduleTitle || currentModule.unitId.toString() !== unit._id.toString()) {
          if (!currentModule || currentModule.unitId.toString() !== unit._id.toString()) {
            currentModuleOrder = 0;
          }
          let existingModule = await Module.findOne({ title: moduleTitle, unitId: unit._id });
          if (existingModule) {
            currentModule = existingModule;
          } else {
            currentModuleOrder++;
            currentModule = await Module.create({
              title: moduleTitle,
              unitId: unit._id,
              chapterId: chapter._id,
              order: currentModuleOrder
            });
            console.log(`Created Module: ${moduleTitle} with sequential order: ${currentModuleOrder}`);
          }
          orderInModule = 1;
        }

        // 7. Map CurriculumItem Type
        let mappedType = 'statement';
        const typeLower = type.toLowerCase().trim();
        if (typeLower === 'comic') mappedType = 'comic';
        else if (typeLower === 'mcq' || typeLower === 'multiple-choice') mappedType = 'multiple-choice';
        else if (typeLower === 'fib' || typeLower === 'fill-in-the-blank') mappedType = 'fill-in-the-blank';
        else if (typeLower === 're-arrange' || typeLower === 'rearrange') mappedType = 'rearrange';
        else if (typeLower === 'concept' || typeLower === 'statement') mappedType = 'statement';
        else if (typeLower === 'video' || typeLower.includes('youtube')) mappedType = 'video';

        const hasYoutube = images.some(img => img.includes('youtube.com') || img.includes('youtu.be'));
        if (hasYoutube) {
          mappedType = 'video';
        }


        const itemDoc = {
          moduleId: currentModule._id,
          order: orderInModule++,
          type: mappedType,
          text: conceptText || '',
          question: question || '',
          options: [],
          words: [],
          answer: answerText || '',
          imageUrl: images[0] || '',
          images: images
        };

        // Shuffling for Rearrange
        if (mappedType === 'rearrange') {
          let finalOptions = [];
          if (optionsStr && optionsStr.trim() !== '') {
            finalOptions = optionsStr.split(',').map(o => o.trim()).filter(Boolean);
          } else if (answerText && answerText.trim() !== '') {
            const parts = answerText.split(',').map(o => o.trim()).filter(Boolean);
            finalOptions = shuffleArray(parts);
          }
          itemDoc.options = finalOptions;
          itemDoc.words = [...finalOptions];
        } else {
          if (optionsStr && optionsStr.trim() !== '') {
            itemDoc.options = optionsStr.split(',').map(o => o.trim()).filter(Boolean);
          }
        }

        await CurriculumItem.create(itemDoc);
      }
    }

    console.log('Automated import of units completed successfully!');
  } catch (error) {
    console.error('Import failed:', error);
  } finally {
    await mongoose.disconnect();
  }
}

run();
