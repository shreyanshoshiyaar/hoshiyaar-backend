import fs from 'fs';
import Papa from 'papaparse';

const findEmptyOptions = (file) => {
  const data = Papa.parse(fs.readFileSync(file, 'utf8'), { header: true, skipEmptyLines: true }).data;
  console.log(`\nChecking ${file} for MCQs with empty Options...`);
  
  for (const row of data) {
    if (String(row.type || '').trim().toLowerCase() === 'mcq') {
      const opt = String(row.Options || '').trim();
      if (!opt) {
        console.log(`Row:`, row);
      }
    }
  }
};

findEmptyOptions('D:\\Q&A Biodiversity - Unit 1 (4).csv');
findEmptyOptions('D:\\Q&A Biodiversity - Unit 2 (2).csv');
