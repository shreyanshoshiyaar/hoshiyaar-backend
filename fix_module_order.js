import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import Papa from 'papaparse';

dotenv.config({ path: 'd:/hoshiyaar/hoshiyaar/Hoshiyaar-backend-main/.env' });

import Chapter from './models/Chapter.js';
import Unit from './models/Unit.js';
import Module from './models/Module.js';

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    
    const chapter = await Chapter.findOne({ title: "Chapter 2: Diversity in the Living World" });
    const unit1 = await Unit.findOne({ chapterId: chapter._id, title: "Unit 1: Plant Characteristics and Grouping" });
    const unit2 = await Unit.findOne({ chapterId: chapter._id, title: "Unit 2: Animal Movement, Habitats, and Adaptations" });

    // Fix Unit 1
    const data1 = Papa.parse(fs.readFileSync('D:\\Q&A Biodiversity - Unit 1 (4).csv', 'utf8'), { header: true, skipEmptyLines: true }).data;
    const lessons1 = [];
    for (const row of data1) {
      const title = String(row.lesson_title || '').trim();
      if (title && !lessons1.includes(title)) lessons1.push(title);
    }
    for (let i = 0; i < lessons1.length; i++) {
      await Module.updateOne({ unitId: unit1._id, title: new RegExp(`^${lessons1[i]}$`, 'i') }, { $set: { order: i + 1 } });
    }
    console.log('Unit 1 module orders updated to match CSV.');

    // Fix Unit 2
    const data2 = Papa.parse(fs.readFileSync('D:\\Q&A Biodiversity - Unit 2 (2).csv', 'utf8'), { header: true, skipEmptyLines: true }).data;
    const lessons2 = [];
    for (const row of data2) {
      const title = String(row.lesson_title || '').trim();
      if (title && !lessons2.includes(title)) lessons2.push(title);
    }
    for (let i = 0; i < lessons2.length; i++) {
      await Module.updateOne({ unitId: unit2._id, title: new RegExp(`^${lessons2[i]}$`, 'i') }, { $set: { order: i + 1 } });
    }
    console.log('Unit 2 module orders updated to match CSV.');
    
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
};

run();
