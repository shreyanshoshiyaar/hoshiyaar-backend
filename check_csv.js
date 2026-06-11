import fs from 'fs';
import Papa from 'papaparse';

const check = (file) => {
  const data = Papa.parse(fs.readFileSync(file, 'utf8'), {header: true}).data;
  const hot = data.filter(r => /hot|difficult/i.test(r.lesson_title));
  console.log(file);
  console.log('Count:', hot.length);
  console.log('Names:', [...new Set(hot.map(r => r.lesson_title))]);
};

check('D:\\Q&A Biodiversity - Unit 1 (4).csv');
check('D:\\Q&A Biodiversity - Unit 2 (2).csv');
