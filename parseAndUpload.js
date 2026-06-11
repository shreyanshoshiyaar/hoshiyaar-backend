import fs from 'fs';
import Papa from 'papaparse';
import axios from 'axios';

const processCSV = async (filePath) => {
  const content = fs.readFileSync(filePath, 'utf8');
  const parsed = Papa.parse(content, { header: true, skipEmptyLines: true });
  
  const data = parsed.data;
  
  const payload = {
    board_title: "Eduvate (CBSE)",
    class_title: "6",
    subject_title: "Science",
    chapter_title: "Chapter 1: Measurement and motion",
    unit_title: "Unit 1",
    replace: true,
    lessons: []
  };

  let currentChapter = "";
  let currentUnit = "";

  const lessonsMap = {};
  const lessonOrder = [];

  for (const row of data) {
    if (!row.lesson_title) continue;
    
    currentChapter = row.Chapter_title ? String(row.Chapter_title).trim() : currentChapter;
    currentUnit = row.Unit_title ? String(row.Unit_title).trim() : currentUnit;
    
    const lessonTitle = String(row.lesson_title).trim();
    if (!lessonTitle) continue;
    
    if (!lessonsMap[lessonTitle]) {
      lessonsMap[lessonTitle] = { lesson_title: lessonTitle, concepts: [] };
      lessonOrder.push(lessonTitle);
    }
    
    const typeRaw = String(row.type || '').trim();
    let mappedType = typeRaw.toLowerCase();
    if (mappedType === 'mcq') mappedType = 'mcq';
    if (mappedType === 'fib') mappedType = 'fillups';
    if (mappedType === 're-arrange') mappedType = 'rearrange';
    if (mappedType === 'comic') mappedType = 'comic';
    if (mappedType === 'concept') mappedType = 'concept';
    
    const conceptText = String(row['concept/statement'] || '').trim();
    const question = String(row.question || '').trim();
    let optionsRaw = String(row.Options || '').trim();
    
    let options = [];
    if (optionsRaw) {
      options = optionsRaw.split(',').map(o => o.trim()).filter(Boolean);
    }
    
    const answer = String(row.answer || '').trim();
    const revise = String(row['Revise?'] || '').trim();
    
    const imgKeys = Object.keys(row).filter(k => k.toLowerCase().includes('image'));
    const images = imgKeys.map(k => String(row[k] || '').trim()).filter(Boolean);
    const imageUrl = images[0] || '';
    
    lessonsMap[lessonTitle].concepts.push({
      type: mappedType,
      text: conceptText,
      question,
      options: options,
      words: (mappedType === 'rearrange') ? options : undefined,
      answer,
      revise: revise,
      imageUrl,
      images
    });
  }

  payload.chapter_title = currentChapter || payload.chapter_title;
  payload.unit_title = currentUnit || payload.unit_title;
  
  payload.lessons = lessonOrder.map(title => lessonsMap[title]);
  
  console.log(`Payload for ${filePath}: Chapter: ${payload.chapter_title}, Unit: ${payload.unit_title}, Lessons: ${payload.lessons.length}`);
  
  try {
    const res = await axios.post('http://localhost:5000/api/curriculum/import', payload);
    console.log(`Success for ${filePath}:`, res.data);
  } catch (err) {
    console.error(`Error for ${filePath}:`, err.response?.data || err.message);
  }
};

const run = async () => {
  await processCSV("D:\\Measurements and Motions - Unit 1 (2).csv");
  await processCSV("D:\\Measurements and Motions - Unit 2 (2).csv");
};

run();
