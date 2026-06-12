import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import Papa from 'papaparse';

dotenv.config({ path: 'd:/hoshiyaar/hoshiyaar/Hoshiyaar-backend-main/.env' });

import Chapter from './models/Chapter.js';
import Unit from './models/Unit.js';
import Module from './models/Module.js';
import CurriculumItem from './models/CurriculumItem.js';
import Subject from './models/Subject.js';
import DefaultRevisionQuestion from './models/DefaultRevisionQuestion.js';

const processCsv = async (csvPath, chapter, subject) => {
    const rawData = fs.readFileSync(csvPath, 'utf8');
    const parsed = Papa.parse(rawData, { header: false, skipEmptyLines: true }).data;
    
    if (parsed.length === 0) return;
    
    const headerRow = parsed[0];
    const newHeaders = [];
    const counts = {};
    for (let h of headerRow) {
      const t = String(h).trim();
      if (!counts[t]) { counts[t] = 1; newHeaders.push(t); }
      else { newHeaders.push(`${t}_${counts[t]}`); counts[t]++; }
    }
    
    const data = parsed.slice(1).map(row => {
      const obj = {};
      newHeaders.forEach((h, i) => { obj[h] = row[i]; });
      return obj;
    });

    // Group by units
    const unitsMap = new Map();
    for (const row of data) {
      const unitTitle = String(row.Unit_title || row.Unit || '').trim();
      if (!unitTitle) continue;
      if (!unitsMap.has(unitTitle)) {
        unitsMap.set(unitTitle, []);
      }
      unitsMap.get(unitTitle).push(row);
    }

    for (const [unitTitle, rows] of unitsMap.entries()) {
      console.log(`\n=== Processing ${unitTitle} ===`);
      const unit = await Unit.findOne({ chapterId: chapter._id, title: { $regex: new RegExp(`^${unitTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } });
      if (!unit) {
         console.error(`Unit not found: ${unitTitle}. Skipping...`);
         continue;
      }

      // Clear existing modules and items for this unit
      const existingModules = await Module.find({ unitId: unit._id });
      for (const mod of existingModules) {
        await CurriculumItem.deleteMany({ moduleId: mod._id });
      }
      await Module.deleteMany({ unitId: unit._id });
      await DefaultRevisionQuestion.deleteMany({ unitId: unit._id });
      console.log(`Cleared existing modules and items for ${unitTitle}.`);

      // Pre-scan for difficult module blocks
      let difficultBlocks = 0;
      let lastLesson = null;
      for (const row of rows) {
        const lt = String(row.Lesson_title || row.lesson_title || '').trim();
        if (lt && lt !== lastLesson) {
          if (/difficult module/i.test(lt)) difficultBlocks++;
          lastLesson = lt;
        }
      }

      console.log(`Found ${difficultBlocks} 'Difficult Module' blocks.`);

      let currentLessonTitle = null;
      let currentModuleId = null;
      let moduleOrder = 0;
      let itemOrder = 0;
      let itemsCreated = 0;
      const titleCounts = {};

      for (const row of rows) {
        const rawLessonTitle = String(row.Lesson_title || row.lesson_title || '').trim();
        if (!rawLessonTitle) continue; // Skip rows without lesson title
        
        // Handle new module block
        if (rawLessonTitle !== currentLessonTitle) {
          currentLessonTitle = rawLessonTitle;
          moduleOrder++;
          itemOrder = 0; // Reset item order for new module
          
          let finalTitle = rawLessonTitle;
          if (!titleCounts[rawLessonTitle]) {
            titleCounts[rawLessonTitle] = 1;
            // For Difficult Module, if there are multiple blocks, append 1 for the first one
            if (/difficult module/i.test(rawLessonTitle) && difficultBlocks > 1) {
              finalTitle = `${rawLessonTitle} 1`;
            }
          } else {
            titleCounts[rawLessonTitle]++;
            finalTitle = `${rawLessonTitle} ${titleCounts[rawLessonTitle]}`;
          }
          
          const newMod = await Module.create({
            chapterId: chapter._id,
            unitId: unit._id,
            title: finalTitle,
            order: moduleOrder
          });
          currentModuleId = newMod._id;
          console.log(`Created Module: ${finalTitle} (Order: ${moduleOrder})`);
        }
        
        // Prepare Item fields
        let mappedType = String(row.Type || row.type || '').trim().toLowerCase();
        if (mappedType === 'mcq') mappedType = 'multiple-choice';
        if (mappedType === 'fib') mappedType = 'fill-in-the-blank';
        if (mappedType === 're-arrange') mappedType = 'rearrange';
        if (mappedType === 'comic') mappedType = 'comic';
        if (mappedType === 'concept') mappedType = 'concept';
        if (mappedType === 'statement') mappedType = 'concept'; // Important! Statements are concepts
        if (mappedType === 'descriptive') mappedType = 'descriptive';
        
        // Options
        const optionsRaw = String(row.Options || row.options || '').trim();
        const options = optionsRaw ? optionsRaw.split(',').map(o => o.trim()).filter(Boolean) : [];
        
        // Images (Strict filter by HTTP/HTTPS to avoid text labels like 'amphibians')
        const imgKeys = Object.keys(row).filter(k => k.toLowerCase().includes('image') || k.toLowerCase().includes('image 1') || k.toLowerCase().includes('image 2'));
        const images = imgKeys
          .map(k => String(row[k] || '').trim())
          .filter(v => v && (v.startsWith('http://') || v.startsWith('https://') || v.startsWith('data:image')));
        
        const question = String(row.Question || row.question || '').trim();
        const text = String(row.Statement || row.statement || row['concept/statement'] || '').trim();
        const answer = String(row.Answer || row.answer || '').trim();
        
        let keywords = [];
        let modelAnswers = [];
        if (mappedType === 'descriptive') {
           keywords = answer ? answer.split(',').map(k => k.trim()).filter(Boolean) : [];
           modelAnswers = text ? [text] : [];
        }
        
        const reviseRaw = String(row['Revise?'] || row.Revise || row.revise || row['revise?'] || '').trim().toLowerCase();
        const revise = (reviseRaw === 'y' || reviseRaw === 'yes');
        
        itemOrder++;
        const newItem = new CurriculumItem({
          moduleId: currentModuleId,
          order: itemOrder,
          type: mappedType,
          text: text,
          question: question,
          options: options,
          words: (mappedType === 'rearrange') ? options : undefined,
          answer: answer,
          keywords: keywords,
          modelAnswers: modelAnswers,
          revise: revise,
          imageUrl: images[0] || '',
          images: images
        });
        await newItem.save();

        if (revise) {
          const revQ = new DefaultRevisionQuestion({
            boardId: subject.boardId,
            classId: subject.classId,
            subjectId: subject._id,
            chapterId: chapter._id,
            unitId: unit._id,
            moduleId: currentModuleId,
            lessonIndex: moduleOrder, // using moduleOrder as proxy
            type: mappedType,
            question: question,
            text: text,
            options: options,
            answer: answer,
            keywords: keywords,
            modelAnswers: modelAnswers,
            words: (mappedType === 'rearrange') ? options : undefined,
            images: images,
            order: itemOrder,
            active: true
          });
          await revQ.save();
        }

        itemsCreated++;
      }
      
      console.log(`Successfully imported ${itemsCreated} items across ${moduleOrder} modules for ${unitTitle}.`);
    }
};

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB');

    const chapter = await Chapter.findOne({ title: { $regex: 'The Invisible Living World', $options: 'i' } });
    if (!chapter) throw new Error("Chapter not found");

    const subject = await Subject.findById(chapter.subjectId);
    if (!subject) throw new Error("Subject not found");

    const csvPath = "D:\\Invisible World - Final (1).csv";
    await processCsv(csvPath, chapter, subject);

  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
};

run();
