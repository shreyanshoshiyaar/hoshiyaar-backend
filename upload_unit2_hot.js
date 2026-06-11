import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import Papa from 'papaparse';
import axios from 'axios';

dotenv.config({ path: 'd:/hoshiyaar/hoshiyaar/Hoshiyaar-backend-main/.env' });

const run = async () => {
  try {
    console.log('Uploading Unit 2 Difficult Module ONLY...');
    const data2 = Papa.parse(fs.readFileSync('D:\\Q&A Biodiversity - Unit 2 (2).csv', 'utf8'), { header: true, skipEmptyLines: true }).data;
    const hot2 = data2.filter(r => /difficult module/i.test(r.lesson_title)); // STRICTLY 'difficult module'
    
    const concepts2 = hot2.map(row => {
      let mappedType = (row.type || '').trim().toLowerCase();
      if (mappedType === 'mcq') mappedType = 'mcq';
      if (mappedType === 'fib') mappedType = 'fillups';
      if (mappedType === 're-arrange') mappedType = 'rearrange';
      if (mappedType === 'comic') mappedType = 'comic';
      if (mappedType === 'concept') mappedType = 'concept';
      
      const optionsRaw = String(row.Options || '').trim();
      const options = optionsRaw ? optionsRaw.split(',').map(o => o.trim()).filter(Boolean) : [];
      const imgKeys = Object.keys(row).filter(k => k.toLowerCase().includes('image'));
      const images = imgKeys.map(k => String(row[k] || '').trim()).filter(Boolean);
      
      return {
        type: mappedType,
        text: String(row['concept/statement'] || '').trim(),
        question: String(row.question || row.Question || '').trim(),
        options: options,
        words: (mappedType === 'rearrange') ? options : undefined,
        answer: String(row.answer || '').trim(),
        revise: String(row.Revise || row['Revise?'] || '').trim(),
        imageUrl: images[0] || '',
        images
      };
    });
    
    if (concepts2.length > 0) {
      const payload2 = {
        board_title: "CBSE",
        class_title: "6",
        subject_title: "Science",
        chapter_title: "Chapter 2: Diversity in the Living World",
        unit_title: "Unit 2: Animal Movement, Habitats, and Adaptations",
        replace: true,
        lessons: [
          {
            lesson_title: "Difficult Module",
            concepts: concepts2
          }
        ]
      };
      const res2 = await axios.post('http://localhost:5000/api/curriculum/import', payload2);
      console.log('Unit 2 Success:', res2.data.importedItems, 'items imported.');
    } else {
      console.log('No Difficult Module found in Unit 2 CSV!');
    }
    
  } catch (err) {
    console.error(err.response?.data || err.message);
  } finally {
    process.exit(0);
  }
};

run();
