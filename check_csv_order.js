import fs from 'fs';
import Papa from 'papaparse';

const checkPosition = (file) => {
  const data = Papa.parse(fs.readFileSync(file, 'utf8'), { header: true, skipEmptyLines: true }).data;
  const lessons = [];
  for (const row of data) {
    const title = String(row.lesson_title || '').trim();
    if (title && !lessons.includes(title)) {
      lessons.push(title);
    }
  }
  console.log(`\nFile: ${file}`);
  console.log(`Lessons in order of appearance:`);
  lessons.forEach((l, i) => {
    console.log(`${i + 1}. ${l}`);
  });
};

checkPosition('D:\\Q&A Biodiversity - Unit 1 (4).csv');
checkPosition('D:\\Q&A Biodiversity - Unit 2 (2).csv');
