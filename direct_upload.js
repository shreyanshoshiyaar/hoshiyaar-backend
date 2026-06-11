import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import Papa from 'papaparse';

dotenv.config({ path: 'd:/hoshiyaar/hoshiyaar/Hoshiyaar-backend-main/.env' });

import Chapter from './models/Chapter.js';
import Unit from './models/Unit.js';
import Module from './models/Module.js';
import CurriculumItem from './models/CurriculumItem.js';
import DefaultRevisionQuestion from './models/DefaultRevisionQuestion.js';

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB');

    // 1. Process Unit 1
    const chapter = await Chapter.findOne({ title: "Chapter 2: Diversity in the Living World" });
    if (!chapter) throw new Error("Chapter not found");

    const unit1 = await Unit.findOne({ chapterId: chapter._id, title: "Unit 1: Plant Characteristics and Grouping" });
    const unit2 = await Unit.findOne({ chapterId: chapter._id, title: "Unit 2: Animal Movement, Habitats, and Adaptations" });

    // Clean up Unit 1
    console.log('Uploading Unit 1 Difficult Module directly...');
    const data1 = Papa.parse(fs.readFileSync('D:\\Q&A Biodiversity - Unit 1 (4).csv', 'utf8'), { header: true, skipEmptyLines: true }).data;
    const hot1 = data1.filter(r => /difficult module/i.test(r.lesson_title));
    
    let mod1 = await Module.findOne({ chapterId: chapter._id, unitId: unit1._id, title: "Difficult Module" });
    if (!mod1) {
      mod1 = await Module.create({ chapterId: chapter._id, unitId: unit1._id, title: "Difficult Module", order: 99 });
    }
    
    await CurriculumItem.deleteMany({ moduleId: mod1._id });
    await DefaultRevisionQuestion.deleteMany({ moduleId: mod1._id });

    let count1 = 0;
    for (const row of hot1) {
      let mappedType = (row.type || '').trim().toLowerCase();
      if (mappedType === 'mcq') mappedType = 'multiple-choice';
      if (mappedType === 'fib') mappedType = 'fill-in-the-blank';
      if (mappedType === 're-arrange') mappedType = 'rearrange';
      if (mappedType === 'comic') mappedType = 'comic';
      if (mappedType === 'concept') mappedType = 'concept';
      
      const optionsRaw = String(row.Options || '').trim();
      const options = optionsRaw ? optionsRaw.split(',').map(o => o.trim()).filter(Boolean) : [];
      const imgKeys = Object.keys(row).filter(k => k.toLowerCase().includes('image'));
      const images = imgKeys.map(k => String(row[k] || '').trim()).filter(Boolean);
      
      const question = String(row.Question || row.question || '').trim();
      
      const newItem = new CurriculumItem({
        moduleId: mod1._id,
        order: ++count1,
        type: mappedType,
        text: String(row['concept/statement'] || '').trim(),
        question: question,
        options: options,
        words: (mappedType === 'rearrange') ? options : undefined,
        answer: String(row.answer || '').trim(),
        revise: String(row['Revise?'] || row.Revise || '').trim(),
        imageUrl: images[0] || '',
        images
      });
      await newItem.save();
    }
    console.log('Unit 1 Success:', count1, 'items imported directly.');

    // Clean up Unit 2
    console.log('Uploading Unit 2 Difficult Module directly...');
    const data2 = Papa.parse(fs.readFileSync('D:\\Q&A Biodiversity - Unit 2 (2).csv', 'utf8'), { header: true, skipEmptyLines: true }).data;
    const hot2 = data2.filter(r => /difficult module/i.test(r.lesson_title));
    
    let mod2 = await Module.findOne({ chapterId: chapter._id, unitId: unit2._id, title: "Difficult Module" });
    if (!mod2) {
      mod2 = await Module.create({ chapterId: chapter._id, unitId: unit2._id, title: "Difficult Module", order: 99 });
    }
    
    await CurriculumItem.deleteMany({ moduleId: mod2._id });
    await DefaultRevisionQuestion.deleteMany({ moduleId: mod2._id });

    let count2 = 0;
    for (const row of hot2) {
      let mappedType = (row.type || '').trim().toLowerCase();
      if (mappedType === 'mcq') mappedType = 'multiple-choice';
      if (mappedType === 'fib') mappedType = 'fill-in-the-blank';
      if (mappedType === 're-arrange') mappedType = 'rearrange';
      if (mappedType === 'comic') mappedType = 'comic';
      if (mappedType === 'concept') mappedType = 'concept';
      
      const optionsRaw = String(row.Options || '').trim();
      const options = optionsRaw ? optionsRaw.split(',').map(o => o.trim()).filter(Boolean) : [];
      const imgKeys = Object.keys(row).filter(k => k.toLowerCase().includes('image'));
      const images = imgKeys.map(k => String(row[k] || '').trim()).filter(Boolean);
      
      const question = String(row.Question || row.question || '').trim();
      
      const newItem = new CurriculumItem({
        moduleId: mod2._id,
        order: ++count2,
        type: mappedType,
        text: String(row['concept/statement'] || '').trim(),
        question: question,
        options: options,
        words: (mappedType === 'rearrange') ? options : undefined,
        answer: String(row.answer || '').trim(),
        revise: String(row.Revise || row['Revise?'] || '').trim(),
        imageUrl: images[0] || '',
        images
      });
      await newItem.save();
    }
    console.log('Unit 2 Success:', count2, 'items imported directly.');
    
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
};

run();
