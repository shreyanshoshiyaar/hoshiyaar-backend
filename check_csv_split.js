import fs from 'fs';
import Papa from 'papaparse';

const checkSplit = (file) => {
  const data = Papa.parse(fs.readFileSync(file, 'utf8'), { header: true, skipEmptyLines: true }).data;
  let currentLesson = null;
  const lessonBlocks = [];
  
  for (let i = 0; i < data.length; i++) {
    const title = String(data[i].lesson_title || '').trim();
    if (title && title !== currentLesson) {
      currentLesson = title;
      lessonBlocks.push({ title, startRow: i + 2, count: 1 });
    } else if (title === currentLesson) {
      lessonBlocks[lessonBlocks.length - 1].count++;
    }
  }
  
  console.log(`\nFile: ${file}`);
  lessonBlocks.forEach((block, idx) => {
    console.log(`${idx + 1}. ${block.title} (Rows: ${block.startRow} to ${block.startRow + block.count - 1}, Count: ${block.count})`);
  });
};

checkSplit('D:\\Q&A Biodiversity - Unit 1 (4).csv');
