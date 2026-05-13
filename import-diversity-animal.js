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
 * Robust CSV parser that handles commas within quotes
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

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const filePath = 'D:/diversity.csv';
    if (!fs.existsSync(filePath)) {
      console.error(`File not found: ${filePath}`);
      process.exit(1);
    }

    console.log(`Processing ${filePath}...`);
    const content = fs.readFileSync(filePath, 'utf-8');
    const rows = parseCSV(content);
    
    // Headers are at index 0
    const data = rows.slice(1);
    console.log(`Found ${data.length} data rows.`);

    // Cleanup previous bogus chapter from failed run
    await Chapter.deleteMany({ title: /^Unit 2: Animal Movement/i });
    console.log('Cleaned up previous bogus Chapter data.');

    const purgedUnits = new Set();
    let currentModule = null;
    let orderInModule = 1;
    let totalImported = 0;

    let lastClass = null;
    let lastBoard = null;
    let lastSubject = null;
    let lastChapter = null;
    let lastUnit = null;
    let lastModuleTitle = null;

    for (const row of data) {
      // Row structure:
      // 0: Class_title
      // 1: Board_title
      // 2: Subject
      // 3: Unit_title (Using as Chapter Title)
      // 4: lesson_title (Using as Unit and Module Title)
      // 5: type
      // 6: concept/statement
      // 7: question
      // 8: Options
      // 9: answer
      // 10: Revise
      // 11: Images 1
      // 12: Images 2
      // 13: Images 3

      if (row.length < 6) continue;

      const classTitle = row[0] || lastClass;
      const boardTitle = row[1] || lastBoard;
      const subjectTitle = row[2] || lastSubject;
      
      // User requested hierarchy:
      // Chapter: Chapter 2: Diversity in the Living World
      // Unit: row[3] (e.g., Unit 2: Animal Movement...)
      // Module: row[4] (e.g., Lesson 1: Grouping Animals)
      
      const chapterTitle = "Chapter 2: Diversity in the Living World"; 
      const unitTitle = row[3] || lastUnit;
      const moduleTitle = row[4] || lastModuleTitle;
      const type = row[5];
      const conceptText = row[6];
      const question = row[7];
      const optionsStr = row[8];
      const answer = row[9];
      const imageUrl1 = row[11];
      const imageUrl2 = row[12];
      const imageUrl3 = row[13];

      if (!unitTitle || !moduleTitle || !type || !boardTitle) continue;

      // Update last seen
      lastClass = classTitle;
      lastBoard = boardTitle;
      lastSubject = subjectTitle;
      lastChapter = chapterTitle;
      lastUnit = unitTitle;
      lastModuleTitle = moduleTitle;

      // 1. Board
      let board = await Board.findOne({ name: boardTitle });
      if (!board) {
        board = await Board.create({ name: boardTitle, slug: boardTitle.toLowerCase().replace(/ /g, '-') });
        console.log(`Created Board: ${boardTitle}`);
      }

      // 2. ClassLevel
      let classLevel = await ClassLevel.findOne({ name: classTitle, boardId: board._id });
      if (!classLevel) {
        classLevel = await ClassLevel.create({ name: classTitle, boardId: board._id, order: parseInt(classTitle) || 0 });
        console.log(`Created ClassLevel: ${classTitle}`);
      }

      // 3. Subject
      let subject = await Subject.findOne({ name: subjectTitle, classId: classLevel._id, boardId: board._id });
      if (!subject) {
        subject = await Subject.create({ name: subjectTitle, boardId: board._id, classId: classLevel._id });
        console.log(`Created Subject: ${subjectTitle}`);
      }

      // 4. Chapter
      let chapter = await Chapter.findOne({ title: chapterTitle, subjectId: subject._id });
      if (!chapter) {
        chapter = await Chapter.create({ title: chapterTitle, subjectId: subject._id, order: 2 });
        console.log(`Created Chapter: ${chapterTitle}`);
      }

      // 5. Unit
      let unit = await Unit.findOne({ title: unitTitle, chapterId: chapter._id });
      if (!unit) {
        unit = await Unit.create({ title: unitTitle, chapterId: chapter._id, order: 1 });
        console.log(`Created Unit: ${unitTitle}`);
      }

      // PURGE only once per Unit identified in this specific run
      const unitKey = unit._id.toString();
      if (!purgedUnits.has(unitKey)) {
        console.log(`Purging existing modules for Unit: ${unitTitle}...`);
        const modulesToPurge = await Module.find({ unitId: unit._id });
        for (const m of modulesToPurge) {
          await CurriculumItem.deleteMany({ moduleId: m._id });
        }
        await Module.deleteMany({ unitId: unit._id });
        purgedUnits.add(unitKey);
        currentModule = null; // Forces module recreation
      }

      // 6. Module (Lesson)
      if (!currentModule || currentModule.title !== moduleTitle || currentModule.unitId.toString() !== unit._id.toString()) {
        let existingModule = await Module.findOne({ title: moduleTitle, unitId: unit._id });
        if (existingModule) {
          currentModule = existingModule;
          console.log(`Using existing Module: ${moduleTitle}`);
        } else {
          currentModule = await Module.create({ 
            title: moduleTitle, 
            unitId: unit._id, 
            chapterId: chapter._id, 
            order: 1 
          });
          console.log(`Created Module: ${moduleTitle}`);
        }
        orderInModule = 1;
      }

      // 7. CurriculumItem
      let mappedType = 'statement';
      const typeLower = type.toLowerCase().trim();
      if (typeLower === 'comic') mappedType = 'comic';
      else if (typeLower === 'mcq') mappedType = 'multiple-choice';
      else if (typeLower === 'fib') mappedType = 'fill-in-the-blank';
      else if (typeLower === 're-arrange' || typeLower === 'rearrange') mappedType = 'rearrange';
      else if (typeLower === 'concept' || typeLower === 'statement') mappedType = 'statement';

      const images = [];
      if (imageUrl1) images.push(imageUrl1);
      if (imageUrl2) images.push(imageUrl2);
      if (imageUrl3) images.push(imageUrl3);

      const options = optionsStr ? optionsStr.split(',').map(o => o.trim()).filter(o => o) : [];

      await CurriculumItem.create({
        moduleId: currentModule._id,
        order: orderInModule++,
        type: mappedType,
        text: conceptText || '',
        question: question || '',
        options: options,
        words: mappedType === 'rearrange' ? options : [],
        answer: answer || '',
        imageUrl: images[0] || '',
        images: images
      });
      totalImported++;
    }

    console.log(`\nImport completed successfully! Total items imported: ${totalImported}`);
  } catch (error) {
    console.error('Import failed:', error);
  } finally {
    await mongoose.disconnect();
  }
}

run();
