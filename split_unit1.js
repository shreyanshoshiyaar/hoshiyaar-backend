import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import Papa from 'papaparse';

dotenv.config({ path: 'd:/hoshiyaar/hoshiyaar/Hoshiyaar-backend-main/.env' });

import Chapter from './models/Chapter.js';
import Unit from './models/Unit.js';
import Module from './models/Module.js';
import CurriculumItem from './models/CurriculumItem.js';

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    
    const chapter = await Chapter.findOne({ title: "Chapter 2: Diversity in the Living World" });
    const unit1 = await Unit.findOne({ chapterId: chapter._id, title: "Unit 1: Plant Characteristics and Grouping" });

    // 1. Delete the merged 'Difficult Module' we created earlier
    const oldMod = await Module.findOne({ chapterId: chapter._id, unitId: unit1._id, title: "Difficult Module" });
    if (oldMod) {
      await CurriculumItem.deleteMany({ moduleId: oldMod._id });
      await Module.deleteOne({ _id: oldMod._id });
      console.log('Deleted old merged Difficult Module.');
    }

    // 2. Read CSV and identify blocks
    const data1 = Papa.parse(fs.readFileSync('D:\\Q&A Biodiversity - Unit 1 (4).csv', 'utf8'), { header: true, skipEmptyLines: true }).data;
    
    let currentTitle = null;
    let blockIndex = 0;
    const blocks = [];
    
    for (const row of data1) {
      const title = String(row.lesson_title || '').trim();
      if (!title) continue;
      
      if (title !== currentTitle) {
        currentTitle = title;
        blockIndex++;
        blocks.push({ originalTitle: title, displayTitle: title, items: [] });
      }
      blocks[blocks.length - 1].items.push(row);
    }

    // Rename duplicate Difficult Modules to 'Difficult Module 1' and 'Difficult Module 2'
    let diffModCount = 0;
    for (const block of blocks) {
      if (/difficult module/i.test(block.originalTitle)) {
        diffModCount++;
        block.displayTitle = `Difficult Module ${diffModCount}`;
      }
    }

    // 3. Create modules and insert items for the Difficult Modules ONLY
    // (We leave the other modules alone since they are already fine, just update their orders based on blocks)
    let globalOrder = 0;
    for (const block of blocks) {
      globalOrder++;
      
      if (/difficult module/i.test(block.originalTitle)) {
        console.log(`Creating ${block.displayTitle} at order ${globalOrder} with ${block.items.length} items`);
        
        let mod = await Module.findOne({ chapterId: chapter._id, unitId: unit1._id, title: block.displayTitle });
        if (!mod) {
          mod = await Module.create({ chapterId: chapter._id, unitId: unit1._id, title: block.displayTitle, order: globalOrder });
        } else {
          await Module.updateOne({ _id: mod._id }, { $set: { order: globalOrder } });
          await CurriculumItem.deleteMany({ moduleId: mod._id }); // clear if exists
        }

        let orderCount = 0;
        for (const row of block.items) {
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
            moduleId: mod._id,
            order: ++orderCount,
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
      } else {
        // Just update the order of the existing module
        await Module.updateOne({ chapterId: chapter._id, unitId: unit1._id, title: new RegExp(`^${block.originalTitle}$`, 'i') }, { $set: { order: globalOrder } });
      }
    }
    
    console.log('Unit 1 successfully updated with split Difficult Modules!');
    
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
};

run();
